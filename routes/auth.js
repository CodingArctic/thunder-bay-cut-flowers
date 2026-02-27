const jwt = require("jsonwebtoken");
const { loadEnvFile } = require('node:process');
loadEnvFile();

// Secure random key stored in .env file
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

/*
    Create a signed JWT token for a user after login
*/
function signToken(user) {
    return jwt.sign(
        {
            user_id: user.user_id,
            username: user.username
        },
        JWT_SECRET,
        { expiresIn: "7d" } // token valid for 7 days
    );
}

/*
    Middleware to protect private routes
    - Checks for token in cookies
    - Verifies token
    - Attaches user info to request
    - API routes: returns 401 if not authenticated
    - Frontend routes: redirects to /login if not authenticated
*/
function requireAuth(req, res, next) {
    try {
        const token = req.cookies?.auth_token;

        if (!token) {
            // No token - handle based on route type
            if (req.originalUrl.startsWith('/api/')) {
                return res.status(401).json({ error: "Authentication required" });
            } else {
                return res.redirect('/login');
            }
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        // attach user info to request for later routes
        req.user = decoded;

        next(); // allow request to continue
    } catch (err) {
        // Invalid or expired token - handle based on route type
        if (req.originalUrl.startsWith('/api/')) {
            return res.status(401).json({ error: "Invalid or expired token" });
        } else {
            return res.redirect('/login');
        }
    }
}

module.exports = {
    signToken,
    requireAuth
};
