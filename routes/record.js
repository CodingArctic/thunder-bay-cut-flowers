const { requireAuth } = require('./auth');

const express = require(`express`),
    path = require(`path`),
    router = express.Router(),
    db = require(`../data/data_access`),
    fs = require('fs');

const { analyzeImage } = require('../scripts/cv_analyze.js');
const { sendAlertEmail } = require('../services/email/mailer');

function normalizeScore(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return null;
    }

    return Math.max(0, Math.min(1, numeric));
}

async function resolvePersistedScore(monitorID, analysis) {
    const analysisScore = normalizeScore(analysis && analysis.score);
    if (analysisScore !== null && analysisScore > 0) {
        return { score: analysisScore, source: 'analysis' };
    }

    const recentRecords = await db.getPastRecords(monitorID, 1);
    const priorScore = recentRecords && recentRecords.length > 0
        ? normalizeScore(recentRecords[recentRecords.length - 1].dehydration_score)
        : null;

    if (priorScore !== null && priorScore > 0) {
        return { score: priorScore, source: 'previous_record' };
    }

    const configuredFallback = normalizeScore(process.env.CV_FALLBACK_SCORE || '0.65');
    const fallbackScore = configuredFallback !== null && configuredFallback > 0 ? configuredFallback : 0.65;
    return { score: fallbackScore, source: 'configured_default' };
}

function getDeviceApiKey(req) {
    const headerValue = req.get('x-device-api-key') || req.get('x-api-key');
    if (!headerValue) {
        return null;
    }

    const apiKey = String(headerValue).trim();
    return apiKey.length > 0 ? apiKey : null;
}

async function handleRecordUpload(req, res, monitorID) {
    const deviceApiKey = getDeviceApiKey(req);
    if (!deviceApiKey) {
        return res.status(401).json({ "error": "Missing device API key" });
    }

    const monitor = await db.getMonitorByApiKey(deviceApiKey);
    if (!monitor) {
        return res.status(401).json({ "error": "Invalid device API key" });
    }

    if (typeof monitorID === `number` && monitor.monitor_id !== monitorID) {
        return res.status(403).json({ "error": "API key is not authorized for this monitor" });
    }

    const resolvedMonitorID = monitor.monitor_id;

    if (req.files && Object.keys(req.files).length !== 0) {
        const uploadedFile = req.files.flower;

        if (!uploadedFile) {
            return res.status(400).json({ "error": "Missing image field 'flower'" });
        }

        if (uploadedFile.mimetype !== 'image/jpeg') {
            return res.status(400).json({ "error": "Invalid file type" });
        }

        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const imageName = `${timestamp}.jpg`;
    const uploadPath = path.join(__dirname, '..', 'imgs', '' + resolvedMonitorID);
        const imagePath = path.join(uploadPath, imageName);

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
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
                const { score, source: scoreSource } = await resolvePersistedScore(resolvedMonitorID, analysis);
                const alertThreshold = Number(process.env.ALERT_EMAIL_SCORE_THRESHOLD || "0.8");
                const alertCooldownHours = Number(process.env.ALERT_EMAIL_COOLDOWN_HOURS || "24");
                const scoreFromFallback = scoreSource !== 'analysis';

                if (scoreFromFallback) {
                    console.warn(`Background analysis used fallback score`, {
                        monitorID: resolvedMonitorID,
                        imageName,
                        score,
                        scoreSource,
                        cvSucceeded: analysis !== null,
                        llmStatus: analysis ? analysis.llm_status : null,
                    });
                }

                let insertedRecord = await db.addRecord(resolvedMonitorID, score, imageName);
                if (!insertedRecord) {
                    console.error(`Failed to insert record into database`, { monitorID: resolvedMonitorID, imageName });
                }

                // Email alerts are optional and env-gated; failures are logged but never break ingestion.
                if (!scoreFromFallback && score <= alertThreshold) {
                    try {
                        const inCooldown = await db.hasRecentAlert(resolvedMonitorID, "dehydration", "email", alertCooldownHours);
                        if (inCooldown) {
                            console.info(`Alert email skipped`, {
                                monitorID: resolvedMonitorID,
                                imageName,
                                score,
                                reason: `cooldown-active`,
                                cooldownHours: alertCooldownHours,
                            });
                        } else {
                            const recipients = await db.getMonitorUserEmails(resolvedMonitorID);
                            if (recipients.length === 0) {
                                console.info(`Alert email skipped`, {
                                    monitorID: resolvedMonitorID,
                                    imageName,
                                    score,
                                    reason: `no-associated-user-emails`,
                                });
                            } else {
                                let sentCount = 0;
                                for (const recipient of recipients) {
                                    const emailResult = await sendAlertEmail({
                                        monitorId: resolvedMonitorID,
                                        score,
                                        imageName,
                                        to: recipient,
                                        subject: `Cut Flower Alert - Monitor ${resolvedMonitorID}`,
                                        headline: `Alert triggered for monitor ${resolvedMonitorID}`,
                                        details: `AI analysis score reached ${score} (threshold ${alertThreshold}).`,
                                        timestamp: new Date().toISOString(),
                                    });

                                    if (!emailResult.sent) {
                                        console.info(`Alert email skipped`, {
                                            monitorID: resolvedMonitorID,
                                            imageName,
                                            score,
                                            recipient,
                                            reason: emailResult.reason,
                                        });
                                    } else {
                                        sentCount += 1;
                                    }
                                }

                                if (sentCount > 0 && insertedRecord && insertedRecord.record_id) {
                                    const insertedAlert = await db.addAlert(insertedRecord.record_id, "dehydration", "email");
                                    if (!insertedAlert) {
                                        console.error(`Failed to insert alert into database`, {
                                            monitorID: resolvedMonitorID,
                                            recordID: insertedRecord.record_id,
                                        });
                                    }
                                } else if (sentCount > 0) {
                                    console.error(`Alert sent but record reference missing; alert row not saved`, {
                                        monitorID: resolvedMonitorID,
                                        imageName,
                                    });
                                }
                            }
                        }
                    } catch (emailErr) {
                        console.error(`Alert email failed`, {
                            monitorID: resolvedMonitorID,
                            imageName,
                            score,
                            error: emailErr,
                        });
                    }
                }

                console.info(`Background analysis summary`, {
                    monitorID: resolvedMonitorID,
                    imageName,
                    cvSucceeded: analysis !== null,
                    geminiUsed: Boolean(analysis && analysis.llm_used),
                    cvScore: analysis ? analysis.cv_score : null,
                    geminiScore: analysis ? analysis.llm_score : null,
                    combinedScore: score,
                    scoreSource,
                    dbInsertSucceeded: Boolean(insertedRecord),
                });
            } catch (err) {
                console.error(`Background image analysis failed`, { monitorID: resolvedMonitorID, imageName, error: err });
            }
        })();

        return;
        
    } else {
        return res.status(400).json({ "error": "An image was not sent" });
    }
}

router.post(`/`, async (req, res) => {
    return handleRecordUpload(req, res, null);
});

router.post(`/:monitorID`, async (req, res) => {
    const monitorID = parseInt(req.params.monitorID);

    if (isNaN(monitorID)) {
        return res.status(400).json({ "error": "Invalid Monitor ID" });
    }

    return handleRecordUpload(req, res, monitorID);
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
    GET /api/record/range/:monitorID?start=&end=&aggregation=auto|raw|hour&maxPoints=
    Returns records in a date/time range.
    - raw: returns all points in range (chronological)
    - hour: returns hourly aggregated points with average/min/max/sample_count
      and representative record IDs (first_record_id/latest_record_id)
    - auto (default): returns raw until point count exceeds maxPoints, then returns hour aggregates
    Requires the authenticated user to be associated with the monitor.
*/
router.get(`/range/:monitorID`, requireAuth, async (req, res) => {
    const monitorID = parseInt(req.params.monitorID);

    if (isNaN(monitorID)) {
        return res.status(400).json({ error: "Invalid Monitor ID" });
    }

    const startRaw = req.query.start;
    const endRaw = req.query.end;

    if (!startRaw || !endRaw) {
        return res.status(400).json({ error: "start and end query parameters are required" });
    }

    const start = new Date(String(startRaw));
    const end = new Date(String(endRaw));

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: "Invalid date/time format for start or end" });
    }

    if (start >= end) {
        return res.status(400).json({ error: "start must be earlier than end" });
    }

    const requestedAggregation = String(req.query.aggregation || "auto").toLowerCase();
    if (!["auto", "raw", "hour"].includes(requestedAggregation)) {
        return res.status(400).json({ error: "aggregation must be one of: auto, raw, hour" });
    }

    const maxPoints = Number(req.query.maxPoints || 500);
    if (!Number.isInteger(maxPoints) || maxPoints < 1 || maxPoints > 10000) {
        return res.status(400).json({ error: "maxPoints must be an integer between 1 and 10000" });
    }

    let monitorExists = await db.monitorExists(monitorID);
    if (!monitorExists) {
        return res.status(404).json({ error: "Invalid Monitor ID" });
    }

    const canAccess = await db.userCanAccessMonitor(req.user.user_id, monitorID);
    if (!canAccess) {
        return res.status(403).json({ error: "You are not authorized to access this monitor" });
    }

    let effectiveAggregation = requestedAggregation;
    if (requestedAggregation === "auto") {
        const count = await db.countRecordsInRange(monitorID, start, end);
        effectiveAggregation = count > maxPoints ? "hour" : "raw";
    }

    let records = null;
    if (effectiveAggregation === "hour") {
        records = await db.getHourlyAverageRecordsInRange(monitorID, start, end);
    } else {
        records = await db.getRecordsInRange(monitorID, start, end);
    }

    if (records === null) {
        return res.status(500).json({ error: "Failed to query monitor records" });
    }

    return res.status(200).json({
        monitorID,
        start: start.toISOString(),
        end: end.toISOString(),
        aggregation: effectiveAggregation,
        imageRecordField: effectiveAggregation === "hour" ? "first_record_id" : "record_id",
        pointCount: records.length,
        data: records,
    });
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