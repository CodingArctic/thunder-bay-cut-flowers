const { requireAuth } = require('./auth');

const express = require(`express`),
    path = require(`path`),
    router = express.Router(),
    db = require(`../data/data_access`),
    fs = require('fs');

const { analyzeImage } = require('../scripts/cv_analyze.js');
/*
    TODO:
    - check an API key to ensure request is from an authorized device
*/

router.post(`/:monitorID`, async (req, res) => {
    const monitorID = parseInt(req.params.monitorID);
    
    if (isNaN(monitorID)) {
        return res.status(400).json({ "error": "Invalid Monitor ID" });
    }

    let monitorExists = await db.monitorExists(monitorID);
    if (!monitorExists) {
        return res.status(404).json({ "error": "Invalid Monitor ID" });
    }

    if (req.files && Object.keys(req.files).length !== 0) {
        const uploadedFile = req.files.flower;

        if (uploadedFile.mimetype !== 'image/jpeg') {
            return res.status(400).json({ "error": "Invalid file type" });
        }

        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const imageName = `${timestamp}.jpg`;
        const uploadPath = path.join(__dirname, '..', 'imgs', '' + monitorID);
        const imagePath = path.join(uploadPath, imageName);

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }

        try {
            await uploadedFile.mv(imagePath);
        } catch (err) {
            console.log(err);
            return res.status(500).json({ "error": "Failed to upload image" });
        }

        // Return immediately after upload so device requests are not blocked by analysis latency.
        res.status(200).json({ "success": true });

        (async () => {
            try {
                const analysis = await analyzeImage(imagePath);
                const score = (analysis && analysis.score !== undefined) ? analysis.score : 0.0;

                let insertedRecord = await db.addRecord(monitorID, score, imageName);
                if (!insertedRecord) {
                    console.error(`Failed to insert record into database`, { monitorID, imageName });
                }

                console.info(`Background analysis summary`, {
                    monitorID,
                    imageName,
                    cvSucceeded: analysis !== null,
                    geminiUsed: Boolean(analysis && analysis.llm_used),
                    cvScore: analysis ? analysis.cv_score : null,
                    geminiScore: analysis ? analysis.llm_score : null,
                    combinedScore: score,
                    dbInsertSucceeded: Boolean(insertedRecord),
                });
            } catch (err) {
                console.error(`Background image analysis failed`, { monitorID, imageName, error: err });
            }
        })();

        return;
        
    } else {
        return res.status(400).json({ "error": "An image was not sent" });
    }
});

/*
    GET /api/record/recent/:monitorID?limit=
    Returns the most recent records associated with a monitor with an optional limit. (default = 6)
    Requires the authenticated user to be associated with the record's monitor.
*/
router.get(`/recent/:monitorID`, requireAuth, async (req, res) => {
    const monitorID = parseInt(req.params.monitorID);
    const limit = parseInt(req.query.limit ? req.query.limit : 6);
    
    if (isNaN(monitorID)) {
        return res.status(400).json({ "error": "Invalid Monitor ID" });
    }

    let monitorExists = await db.monitorExists(monitorID);
    if (!monitorExists) {
        return res.status(404).json({ "error": "Invalid Monitor ID" });
    }

    const canAccess = await db.userCanAccessMonitor(req.user.user_id, monitorID);
    if (!canAccess) {
        return res.status(403).json({ "error": "You are not authorized to access this monitor" });
    }

    let records = await db.getPastRecords(monitorID, limit);
    return res.status(200).json(records);
});

/*
    GET /api/record/image/:recordID
    Returns the image associated with a record.
    Requires the authenticated user to be associated with the record's monitor.
*/
router.get(`/image/:recordID`, requireAuth, async (req, res) => {
    const recordID = parseInt(req.params.recordID);

    if (isNaN(recordID)) {
        return res.status(400).json({ "error": "Invalid Record ID" });
    }

    const record = await db.getRecordById(recordID);
    if (!record) {
        return res.status(404).json({ "error": "Record not found" });
    }

    const canAccess = await db.userCanAccessMonitor(req.user.user_id, record.monitor_id);
    if (!canAccess) {
        return res.status(403).json({ "error": "You are not authorized to access this monitor" });
    }

    if (!record.file_path) {
        return res.status(404).json({ "error": "No image associated with this record" });
    }

    // file_path is stored as /imgs/{monitorID}/{filename}; resolve to an absolute path
    const imagePath = path.join(__dirname, `..`, record.file_path);

    if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ "error": "Image file not found on disk" });
    }

    return res.sendFile(imagePath);
});

module.exports = router;