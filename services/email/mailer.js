const nodemailer = require("nodemailer");
const { loadEnvFile } = require("node:process");

loadEnvFile();

let cachedTransporter = null;
const BLOCKED_EMAIL_DOMAINS = ["farm.com"];

function isEmailAlertsEnabled() {
    return process.env.ALERT_EMAIL_ENABLED === "true";
}

function getTransporter() {
    if (cachedTransporter) {
        return cachedTransporter;
    }

    const user = process.env.ALERT_EMAIL_GMAIL_USER;
    const pass = process.env.ALERT_EMAIL_GMAIL_APP_PASSWORD;

    if (!user || !pass) {
        throw new Error("Missing ALERT_EMAIL_GMAIL_USER or ALERT_EMAIL_GMAIL_APP_PASSWORD env vars");
    }

    cachedTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user,
            pass,
        },
    });

    return cachedTransporter;
}

function buildAlertBody(payload) {
    const {
        monitorId,
        score,
        imageName,
        headline,
        details,
        timestamp,
    } = payload;

    const safeHeadline = headline || "Cut Flower Alert";
    const safeDetails = details || "No additional details provided.";
    const safeTimestamp = timestamp || new Date().toISOString();

    const text = [
        safeHeadline,
        "",
        `Monitor ID: ${monitorId}`,
        `Score: ${score}`,
        `Image: ${imageName || "n/a"}`,
        `Timestamp: ${safeTimestamp}`,
        "",
        safeDetails,
    ].join("\n");

    const html = `
        <h2>${safeHeadline}</h2>
        <p><strong>Monitor ID:</strong> ${monitorId}</p>
        <p><strong>Score:</strong> ${score}</p>
        <p><strong>Image:</strong> ${imageName || "n/a"}</p>
        <p><strong>Timestamp:</strong> ${safeTimestamp}</p>
        <p>${safeDetails}</p>
    `;

    return { text, html };
}

function isBlockedRecipient(email) {
    if (!email || typeof email !== "string") {
        return true;
    }

    const atIndex = email.lastIndexOf("@");
    if (atIndex < 0 || atIndex === email.length - 1) {
        return true;
    }

    const domain = email.slice(atIndex + 1).trim().toLowerCase();
    return BLOCKED_EMAIL_DOMAINS.some(
        blocked => domain === blocked || domain.endsWith(`.${blocked}`)
    );
}

async function sendAlertEmail(payload) {
    if (!isEmailAlertsEnabled()) {
        return { sent: false, reason: "disabled" };
    }

    const from = process.env.ALERT_EMAIL_FROM || process.env.ALERT_EMAIL_GMAIL_USER;
    const to = payload.to;

    if (!to) {
        return { sent: false, reason: "missing-recipient" };
    }

    if (isBlockedRecipient(to)) {
        return { sent: false, reason: "blocked-recipient-domain" };
    }

    const subject = payload.subject || process.env.ALERT_EMAIL_SUBJECT || "Cut Flower Alert";

    const { text, html } = buildAlertBody(payload);

    const transporter = getTransporter();
    const info = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
    });

    return {
        sent: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
    };
}

module.exports = {
    isEmailAlertsEnabled,
    sendAlertEmail,
    isBlockedRecipient,
};
