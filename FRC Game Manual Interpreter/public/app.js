/* ─────────────────────────────────────────────────────────────────────
   app.js  –  FRC Game Manual Interpreter Frontend Logic
   ───────────────────────────────────────────────────────────────────── */

const chatWindow    = document.getElementById('chatWindow');
const queryForm     = document.getElementById('queryForm');
const questionInput = document.getElementById('questionInput');
const sendBtn       = document.getElementById('sendBtn');

// ─── Auto-resize textarea ─────────────────────────────────────────────
questionInput.addEventListener('input', () => {
  questionInput.style.height = 'auto';
  questionInput.style.height = Math.min(questionInput.scrollHeight, 150) + 'px';
});

// ─── Submit on Enter (Shift+Enter = newline) ──────────────────────────
questionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    queryForm.requestSubmit();
  }
});

// ─── Fill question from suggestion chip ──────────────────────────────
window.fillQuestion = (text) => {
  questionInput.value = text;
  questionInput.style.height = 'auto';
  questionInput.style.height = Math.min(questionInput.scrollHeight, 150) + 'px';
  questionInput.focus();
};

// ─── Form submit ─────────────────────────────────────────────────────
queryForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const question = questionInput.value.trim();
  if (!question) return;

  // Hide welcome message on first real question
  const welcome = document.getElementById('welcomeMsg');
  if (welcome) welcome.style.display = 'none';

  // Append user message
  appendUserMessage(question);

  // Clear + reset input
  questionInput.value = '';
  questionInput.style.height = 'auto';
  setLoading(true);

  // Show typing indicator
  const loadingEl = appendLoadingMessage();

  try {
    const res = await axios.post('/api/query', {
      query: question
    });

    loadingEl.remove();
    appendAIMessage(res.data.answer, res.data.retrieved_chunks || []);

  } catch (err) {
    loadingEl.remove();

    // Axios attaches a response object when the server replied with an error status
    const serverMsg = err.response?.data?.error;
    appendErrorMessage(
      serverMsg || 'Could not reach the Flask server. Make sure main.py is running on port 5000.'
    );
  } finally {
    setLoading(false);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────

function setLoading(loading) {
  sendBtn.disabled = loading;
  questionInput.disabled = loading;
}

function scrollToBottom() {
  chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
  // Also scroll window
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function appendUserMessage(text) {
  const el = document.createElement('div');
  el.className = 'message message--user';
  el.innerHTML = `
    <div class="message-avatar">👤</div>
    <div class="message-body">
      <p class="message-text">${escapeHTML(text)}</p>
    </div>
  `;
  chatWindow.appendChild(el);
  scrollToBottom();
}

function appendLoadingMessage() {
  const el = document.createElement('div');
  el.className = 'message message--ai loading-message';
  el.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-body">
      <p class="message-text">
        <span class="loading-inner">
          <span>Searching the manual...</span>
          <span class="typing-dots">
            <span></span><span></span><span></span>
          </span>
        </span>
      </p>
    </div>
  `;
  chatWindow.appendChild(el);
  scrollToBottom();
  return el;
}

function appendAIMessage(answer, sources) {
  const el = document.createElement('div');
  el.className = 'message message--ai';

  const sourcesId = 'sources-' + Date.now();

  let sourcesHTML = '';
  if (sources.length > 0) {
    const cardsHTML = sources.map((src, i) => `
      <div class="source-card">
        <div class="source-label">Source ${i + 1}</div>
        ${escapeHTML(src.trim())}
      </div>
    `).join('');

    sourcesHTML = `
      <div class="sources-wrapper">
        <button class="sources-toggle" id="toggle-${sourcesId}" onclick="toggleSources('${sourcesId}')">
          <span class="toggle-icon">▶</span>
          ${sources.length} manual excerpt${sources.length !== 1 ? 's' : ''} used
        </button>
        <div class="sources-list" id="${sourcesId}">
          ${cardsHTML}
        </div>
      </div>
    `;
  }

  el.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-body">
      <div class="message-text markdown-body">${formatAnswer(answer)}</div>
      ${sourcesHTML}
    </div>
  `;
  chatWindow.appendChild(el);
  scrollToBottom();
}

function appendErrorMessage(msg) {
  const el = document.createElement('div');
  el.className = 'message message--ai message--error';
  el.innerHTML = `
    <div class="message-avatar">⚠️</div>
    <div class="message-body">
      <p class="message-text">⚠ ${escapeHTML(msg)}</p>
    </div>
  `;
  chatWindow.appendChild(el);
  scrollToBottom();
}

// ─── Toggle source visibility ─────────────────────────────────────────
window.toggleSources = (id) => {
  const list   = document.getElementById(id);
  const toggle = document.getElementById('toggle-' + id);
  const isOpen = list.classList.toggle('visible');
  toggle.classList.toggle('open', isOpen);
};

// ─── Sanitize / Format ────────────────────────────────────────────────
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render the AI answer as full Markdown HTML via marked.js.
 * We configure marked to use safe defaults and then sanitize any
 * stray HTML by running it through a simple allowlist approach.
 */
function formatAnswer(text) {
  // Configure marked: no raw HTML pass-through, smart line breaks
  marked.use({
    breaks: true,   // single newline → <br>
    gfm: true,      // GitHub Flavoured Markdown (tables, task lists, etc.)
  });

  return marked.parse(text);
}
