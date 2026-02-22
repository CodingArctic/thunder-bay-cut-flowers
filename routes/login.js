const express = require("express");
const router = express.Router();

const bcrypt = require("bcryptjs");
const db = require("../data/data_access");
const { signToken } = require("./auth");
const { loadEnvFile } = require('node:process');
loadEnvFile();

const isSecure = process.env.ENVIRONMENT === "prod" ? true : false;

/*
    POST /api/login
    Authenticates a user and sends JWT cookie
*/
router.post("/", async (req, res) => {
    try {
        if (!req.body || !req.body[`username`] || !req.body[`password`]) {
            res.status(400).send({ error: "Username and password are required" });
            return;
        }

        let { username, password } = req.body;

        // Get user from database
        const user = await db.getUserByUsername(username);

        if (!user) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // Compare password with bcrypt hash
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // Create JWT token
        const token = signToken(user);

        // Send token in HTTP-only cookie
        res.cookie("auth_token", token, {
            httpOnly: true,
            secure: isSecure,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.status(200).json({ success: true });

    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});


/*
    POST /api/login/logout
    Clears authentication cookie
*/
router.post("/logout", (req, res) => {
    res.clearCookie("auth_token");
    return res.status(200).json({ success: true });
});

module.exports = router;
