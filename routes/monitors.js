const express = require(`express`),
    router = express.Router(),
    db = require(`../data/data_access`);
const crypto = require(`crypto`);

function generateDeviceApiKey() {
    return `cfm_${crypto.randomBytes(24).toString(`hex`)}`;
}

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

/*
    POST /api/monitors/create
    Creates a new monitor with a generated API key and links it to the authenticated user.
*/
router.post(`/create`, async (req, res) => {
    const incomingName = req.body?.name;
    const monitorName = incomingName ? String(incomingName).trim() : ``;

    if (!monitorName) {
        return res.status(400).json({ error: `name is required` });
    }

    if (monitorName.length > 120) {
        return res.status(400).json({ error: `name must be 120 characters or less` });
    }

    let createdMonitor = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const apiKey = generateDeviceApiKey();
        createdMonitor = await db.createMonitor(monitorName, apiKey);
        if (createdMonitor) {
            break;
        }
    }

    if (!createdMonitor) {
        return res.status(500).json({ error: `Failed to create monitor` });
    }

    const association = await db.associateUserToMonitor(req.user.user_id, createdMonitor.monitor_id);
    if (!association) {
        return res.status(500).json({ error: `Monitor was created but could not be linked to your account` });
    }

    return res.status(201).json({
        success: true,
        monitorID: createdMonitor.monitor_id,
        name: createdMonitor.name,
        apiKey: createdMonitor.api_key,
    });
});

module.exports = router;