const express = require(`express`),
    path = require(`path`),
    router = express.Router(),
    db = require(`../data/data_access`),
    fs = require('fs');

/*
    TODO:
    - check an API key to ensure request is from an authorized device
    - add the call to ML model to process image and save decimal value to DB
*/

router.post(`/:monitorId`, async (req, res) => {
    const monitorId = parseInt(req.params.monitorId);
    
    if (isNaN(monitorId)) {
        return res.status(400).json({ "error": "Invalid Monitor ID" });
    }

    let monitorExists = await db.monitorExists(monitorId);
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
        const uploadPath = path.join(__dirname, '..', 'imgs', '' + monitorId);
        const imagePath = path.join(uploadPath, imageName);

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }

        uploadedFile.mv(imagePath, (err) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ "error": "Failed to upload image" });
            } 
        });

        let insertedRecord = await db.addRecord(monitorId, 0.98, imageName);
        if (!insertedRecord) {
            return res.status(500).json({ "error": "Failed to insert record into database" });
        }
    
        return res.status(200).json({ "success": true });
        
    } else {
        return res.status(400).json({ "error": "An image was not sent" });
    }
});

module.exports = router;