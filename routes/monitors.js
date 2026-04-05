const express = require(`express`),
    router = express.Router(),
    db = require(`../data/data_access`);

router.get(`/all`, async (req, res) => {
    let monitors = await db.getMonitors(req.user.user_id);
    return res.status(200).json({
        monitorIDs: monitors.map(a => a.monitor_id)
    });
});

/*
    POST /api/monitors/claim
    Associates the authenticated user to a monitor by device API key.
*/
router.post(`/claim`, async (req, res) => {
    const incomingKey = req.body?.deviceApiKey || req.body?.apiKey;
    const deviceApiKey = incomingKey ? String(incomingKey).trim() : "";

    if (!deviceApiKey) {
        return res.status(400).json({ error: "deviceApiKey is required" });
    }

    const monitor = await db.getMonitorByApiKey(deviceApiKey);
    if (!monitor) {
        return res.status(404).json({ error: "No monitor found for the provided key" });
    }

    const association = await db.associateUserToMonitor(req.user.user_id, monitor.monitor_id);
    if (!association) {
        return res.status(500).json({ error: "Failed to claim monitor" });
    }

    return res.status(200).json({
        success: true,
        monitorID: monitor.monitor_id,
        alreadyAssociated: !association.created,
    });
});

module.exports = router;