const express = require(`express`),
    router = express.Router(),
    db = require(`../data/data_access`);

router.get(`/all`, async (req, res) => {
    let monitors = await db.getMonitors(req.user.user_id);
    return res.status(200).json({
        monitorIDs: monitors.map(a => a.monitor_id)
    });
});

module.exports = router;