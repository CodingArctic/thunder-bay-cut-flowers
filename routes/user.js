const express = require(`express`),
    router = express.Router(),
    db = require(`../data/data_access`);

function getSettingsWithDefaults(settings) {
    const current = settings && typeof settings === 'object' ? settings : {};
    const notifications = current.notifications && typeof current.notifications === 'object'
        ? current.notifications
        : {};

    return {
        ...current,
        notifications: {
            enabled: typeof notifications.enabled === 'boolean' ? notifications.enabled : true,
        },
    };
}

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

        return res.status(200).json({
            ...user,
            settings: getSettingsWithDefaults(user.settings),
        });
    } catch (error) {
        console.error("Error fetching user info:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * GET /api/user/alerts/recent?limit=10
 * Returns recent alerts for monitors linked to the authenticated account
 */
router.get(`/alerts/recent`, async (req, res) => {
    try {
        const rawLimit = Number(req.query.limit || 10);
        const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 100)) : 10;
        const alerts = await db.getRecentAlertsForUser(req.user.user_id, limit);
        return res.status(200).json({ alerts });
    } catch (error) {
        console.error("Error fetching recent alerts:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * PATCH /api/user/settings/notifications
 * Updates account-level notifications settings for the authenticated account
 */
router.patch(`/settings/notifications`, async (req, res) => {
    try {
        const enabled = req.body?.enabled;
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: "enabled must be a boolean" });
        }

        const updatedUser = await db.updateUserSettings(req.user.user_id, {
            notifications: { enabled },
        });

        if (!updatedUser) {
            return res.status(500).json({ error: "Failed to update notification settings" });
        }

        return res.status(200).json({
            success: true,
            settings: getSettingsWithDefaults(updatedUser.settings),
        });
    } catch (error) {
        console.error("Error updating notification settings:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
