const express = require(`express`),
    router = express.Router(),
    db = require(`../data/data_access`);

/**
 * GET /api/user/me
 * Get current authenticated user's account information
 * Requires authentication (handled by middleware in app.js)
 */
router.get(`/me`, async (req, res) => {
    try {
        // req.user is attached by the requireAuth middleware
        const user = await db.getUserById(req.user.user_id);
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching user info:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
