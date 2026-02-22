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
        // Basic validation
        if (!req.body || !req.body[`email`] || !req.body[`username`] || !req.body[`password`]) {
            res.status(400).send({ error: "Email, username, and password are required" });
            return;
        }

        const { email, username, password } = req.body;

        // Simple length check
        if (password.length < 8) {
            return res.status(400).json({
                error: "Password must be at least 8 characters"
            });
        }

        // Check if username already exists
        const existingUser = await db.getUserByUsername(username);

        if (existingUser) {
            return res.status(409).json({
                error: "Username already exists"
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert new user
        const newUser = await db.createUser(email, username, passwordHash);

        if (!newUser) {
            return res.status(500).json({
                error: "Failed to create user"
            });
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