const express = require("express");
const router = express.Router();

const bcrypt = require("bcryptjs");
const db = require("../data/data_access");

/*
    POST /register
    Creates a new user account
*/
router.post("/", async (req, res) => {
    try {
        const { email, username, password, firstName, lastName, phoneNumber } = req.body || {};

        const trimmedEmail    = (email       || '').trim();
        const trimmedUsername = (username    || '').trim();
        const trimmedFirst    = (firstName   || '').trim();
        const trimmedLast     = (lastName    || '').trim();
        const trimmedPhone    = (phoneNumber || '').trim();

        if (!trimmedEmail || !trimmedUsername || !password || !trimmedFirst || !trimmedLast) {
            return res.status(400).json({ error: "First name, last name, email, username, and password are required" });
        }

        // Password length limits (min 8, max 128 — prevents bcrypt DoS)
        if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }
        if (password.length > 128) {
            return res.status(400).json({ error: "Password must be at most 128 characters" });
        }

        // Email format check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            return res.status(400).json({ error: "Invalid email address" });
        }

        // Username: letters, numbers, underscores, hyphens only
        if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
            return res.status(400).json({ error: "Username may only contain letters, numbers, underscores, and hyphens" });
        }

        // Check if username already exists
        let existingUser = await db.getUserByUsername(trimmedUsername);

        if (existingUser) {
            return res.status(409).json({ error: "Username already exists" });
        }

        // Check if email already exists
        existingUser = await db.getUserByEmail(trimmedEmail);

        if (existingUser) {
            return res.status(409).json({ error: "Email already registered" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert new user
        const newUser = await db.createUser(trimmedEmail, trimmedUsername, passwordHash, trimmedFirst, trimmedLast, trimmedPhone || null);

        if (!newUser) {
            return res.status(500).json({ error: "Failed to create user" });
        }

        return res.status(201).json({
            success: true,
            message: "User registered successfully"
        });

    } catch (err) {
        console.error("Registration error:", err);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
});

module.exports = router;