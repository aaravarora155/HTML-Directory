import express from "express";
import nodemailer from "nodemailer";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Initialize the OAuth2 client using Google Cloud Credentials
const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground" // Standard redirect URI used for generating tokens
);

// Set the permanent refresh token so the app can automatically refresh its access
oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

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
        // 1. Get a fresh, temporary Access Token from Google
        const accessTokenResponse = await oauth2Client.getAccessToken();
        const accessToken = accessTokenResponse.token;

        if (!accessToken) {
            throw new Error("Failed to generate Google API access token.");
        }

        // 2. Configure Nodemailer to pass authentication through the Gmail API instead of SMTP ports
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: "helpdesk.directory@gmail.com", // Your Gmail account
                clientId: process.env.GMAIL_CLIENT_ID,
                clientSecret: process.env.GMAIL_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_REFRESH_TOKEN,
                accessToken: accessToken,
            },
        });

        const preparedStatement = `
        <p>Hello ${name},</p>
        <p>We received a request from your email: <strong>${email}</strong></p>
        <p>Issue details:</p>
        <p>${issue}</p>
        <p>We are working hard to resolve your issue. If you have any further questions, please contact us at: <a href="mailto:helpdesk.directory@gmail.com">helpdesk.directory@gmail.com</a>.</p>
        <p>Thank you,<br>
        The Support Team</p>
        `;

        // 3. Deliver the email via the secure API tunnel
        await transporter.sendMail({
            from: `"Pixel Spot Support" <helpdesk.directory@gmail.com>`,
            to: email, // Sends confirmation to the user who filled out the form
            bcc: "helpdesk.directory@gmail.com", // Hidden copy sent back to your inbox
            subject: generateSubject(),
            html: preparedStatement,
        });

        res.json({ success: true, message: "Email sent successfully via Gmail API" });
    } catch (err) {
        console.error("Error sending email via Gmail API:", err);
        res.status(500).json({ success: false, message: "Failed to send email" });
    }
});

export default router;