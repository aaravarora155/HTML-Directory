import express from 'express';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import session from 'express-session';
import passport from 'passport';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
app.set('trust proxy', 1);
app.set('strict routing', false);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- AUTHENTICATION SETUP ---
app.use(session({
    name: "auth-lv3-session",
    secret: process.env.SESSION_SECRET || "A5GHIuJklhgbHFHSs",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// --- GLOBAL AUTHENTICATION FILTER ---
app.use((req, res, next) => {
    const publicPaths = [
        '/Login',
        '/Register',
        '/master.css',
        '/Images',
        '/login',
        '/register',
        '/auth/google',
        '/favicon.ico',
        '/Download',
        '/Installers'
    ];

    const isPublic = publicPaths.some(p => req.url.startsWith(p)) || req.url === '/';
    
    if (isPublic || req.isAuthenticated()) {
        return next();
    }
    
    console.log(`🔒 Protecting path: ${req.url}`);
    res.redirect('/Login');
});

const projects = [
    { path: '/28.1-JSON/', folder: './Assignments/28.1 JSON/index.js' },
    { path: '/28.2-Axios/', folder: './Assignments/28.2 Axios/index.js' },
    { path: '/28.3-API-Authentication/', folder: './Assignments/28.3 API Authentication/index.js' },
    { path: '/28.4-REST-APIs/', folder: './Assignments/28.4 REST APIs/index.js' },
    { path: '/30.1-DIY-API/', folder: './Assignments/30.1 DIY API/index.js' },
    { path: '/33.1-PostgreSQL/', folder: './Assignments/33.1 PostgreSQL/index.js' },
    { path: '/33.5-Family-Travel-Tracker/', folder: './Assignments/33.5 Family Travel Tracker/index.js' },
    { path: '/34.5-Authentication-Lv.3/', folder: './Assignments/34.5 Authentication Lv.3/index.js' },

    { path: '/24-Secrets-Project/', folder: './Projects/Secrets Project/index.js' },
    { path: '/25-Band-Generator-Project/', folder: './Projects/Band Generator Project/index.js' },
    { path: '/26-Blog-Application/', folder: './Projects/Blog Website/index.js' },
    { path: '/28-Secrets-Project-2/', folder: './Projects/Secrets Project 2/index.js' },
    { path: '/29-API-Project/', folder: './Projects/Public API Project/index.js' },
    { path: '/30-Blog-API/', folder: './Projects/Blog API Project/index.js' },
    { path: '/31-Permalist-Project/', folder: './Projects/Permalist Project/index.js' },
    { path: '/32-Book-Notes-Project/', folder: './Projects/Book Notes Project/index.js' },
    
    { path: '/contact/', folder: './Contact/contactBackend.js'},
    { path: '/', folder: './login.js'}
];

// --- 1. THE STRAY REQUEST FIXER ---
// This handles requests from sub-projects that accidentally hit the root.
// Example: <link href="/css/style.css"> in a project will hit /css/style.css
// Example: <form action="/check"> will hit /check
// This middleware uses the Referer header to route them back to the correct project.
app.use((req, res, next) => {
    const referer = req.get('Referer');
    if (referer) {
        try {
            const refUrl = new URL(referer, `http://${req.get('host')}`);
            const project = projects.find(p => {
                const pPath = p.path.endsWith('/') ? p.path : p.path + '/';
                const rPath = refUrl.pathname.endsWith('/') ? refUrl.pathname : refUrl.pathname + '/';
                return rPath.startsWith(pPath);
            });
            
            if (project && req.url === '/') {
                // If we hit root but came from a project, go back to project root
                console.log(`🏠 Fixing stray root request from ${project.path}`);
                return res.redirect(307, project.path);
            }

            if (project && !req.url.startsWith(project.path) && !req.url.startsWith(project.path.slice(0, -1))) {
                // Fix absolute paths (e.g. /css/style.css -> /project/css/style.css)
                const newPath = path.posix.join(project.path, req.url);
                
                // If it's a page request (no dot), redirect so browser URL is fixed
                if (!req.url.includes('.')) {
                    console.log(`🚀 Redirecting to fixed path: ${newPath}`);
                    return res.redirect(307, newPath);
                }
                
                // If it's an asset, internal rewrite is fine
                req.url = newPath;
            }
        } catch (e) { /* ignore safe */ }
    }

    // --- DEEP ASSET FIXER ---
    // If a request is for a file (.css, .png, etc.) inside a project path
    // but includes route segments (e.g. /project/submit/css/style.css),
    // we search for the asset by stripping those segments.
    if (req.url.includes('.') && !req.url.includes('node_modules')) {
        const project = projects.find(p => req.url.startsWith(p.path));
        if (project) {
            const absolutePath = path.resolve(__dirname, project.folder);
            const projectDir = path.dirname(absolutePath);
            const searchFolders = [projectDir, path.join(projectDir, 'public')];
            
            let relPath = req.url.substring(project.path.length); // e.g. "submit/css/style.css"
            let segments = relPath.split('/');
            
            while (segments.length > 0) {
                const testPath = segments.join('/');
                for (const folder of searchFolders) {
                    const fullPath = path.join(folder, testPath);
                    if (fs.existsSync(fullPath) && !fs.lstatSync(fullPath).isDirectory()) {
                        // console.log(`🎯 Deep Asset Match: ${req.url} -> ${fullPath}`);
                        return res.sendFile(fullPath);
                    }
                }
                segments.shift(); // Strip one segment and try again
            }
        }
    }
    next();
});

// 2. Load projects and sandbox them
async function loadProjects() {
    for (const project of projects) {
        try {
            const absolutePath = path.resolve(__dirname, project.folder);
            const projectDir = path.dirname(absolutePath);
            const fileUrl = pathToFileURL(absolutePath).href;
            const module = await import(fileUrl);
            const router = module.default;

            if (router) {
                // Serve assets for this project specifically
                app.use(project.path, express.static(projectDir));
                app.use(project.path, express.static(path.join(projectDir, 'public')));

                app.use(project.path, (req, res, next) => {
                    // SANDBOX EJS: Force the lookup to the sub-folder
                    const _render = res.render;
                    res.render = function(view, options, fn) {
                        const viewPath = path.join(projectDir, 'views', view.endsWith('.ejs') ? view : view + '.ejs');
                        return _render.call(this, viewPath, options, fn);
                    };
                    
                    // NORMALIZE PATH: Strip prefix for the sub-router
                    const originalUrl = req.url;
                    req.url = (req.url === '' || req.url === '/') ? '/' : req.url;
                    
                    router(req, res, (err) => {
                        req.url = originalUrl;
                        next(err);
                    });
                });
            }
        } catch (e) { console.error(e); }
    }
}

await loadProjects();

// Move static serving AFTER auth check and projects
app.use(express.static('Hosting', { extensions: ['html'] }));
app.use(express.static(__dirname)); 

// --- 3. HUB HOME & ERROR HANDLING ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Global Error Handler to prevent 502 Bad Gateways
app.use((err, req, res, next) => {
    console.error("Critical Hub Error:", err.message);
    res.status(500).send("A project encountered an error. Check the server logs.");
});

app.listen(port, () => console.log(`🚀 Hub Online: http://localhost:${port}`));