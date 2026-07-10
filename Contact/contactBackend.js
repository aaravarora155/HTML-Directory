import express from "express";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Initialize the Google OAuth2 client using the keys you saved
const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

// Bind the authenticated client directly to the Gmail REST Service
const gmail = google.gmail({ version: "v1", auth: oauth2Client });

function generateSubject() {
    const ticketNum = Math.ceil(Math.random() * 1000000);
    return "Support Ticket: Pixel Spot - " + ticketNum;
}

router.post("/send-email", async (req, res) => {
    console.log("Request body:", req.body);
    const { name, email, issue } = req.body;

    if (!name || !email || !issue) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        const subject = generateSubject();
        const preparedStatement = `
        <p>Hello ${name},</p>
        <p>We received a request from your email: <strong>${email}</strong></p>
        <p>Issue details:</p>
        <p>${issue}</p>
        <p>We are working hard to resolve your issue. If you have any further questions, please contact us at: <a href="mailto:helpdesk.directory@gmail.com">helpdesk.directory@gmail.com</a>.</p>
        <p>Thank you,<br>
        The Support Team</p>
        `;

        // Build a raw RFC 2822 compliant email string manually to bypass SMTP layout requirements
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const messageParts = [
            `From: "Pixel Spot Support" <helpdesk.directory@gmail.com>`,
            `To: ${email}`,
            `Bcc: helpdesk.directory@gmail.com`,
            `Subject: ${utf8Subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            'Content-Transfer-Encoding: 7bit',
            '',
            preparedStatement
        ];
        const message = messageParts.join('\n');

        // Encode the string safely into a URL-safe Base64 payload
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // Make an HTTPS POST request straight over standard web routes (Port 443)
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
            },
        });

        res.json({ success: true, message: "Email sent successfully via secure HTTP API!" });
    } catch (err) {
        console.error("Error sending email via Gmail REST API:", err);
        res.status(500).json({ success: false, message: "Failed to send email" });
    }
});

export default router;