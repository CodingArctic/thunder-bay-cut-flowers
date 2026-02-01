const express = require(`express`),
    path = require(`path`),
    router = express.Router();

/*
    TODO:
    - check monitor ID against DB
    - check an API key to ensure request is from an authorized device
    - add the call to ML model to process image and save decimal value to DB
*/

router.post(`/:monitorId`, async (req, res) => {
    const monitorId = parseInt(req.params.monitorId);
    
    if (isNaN(monitorId)) {
        return res.status(400).json({ "error": "Invalid Monitor ID" });
    }

    if (req.files && Object.keys(req.files).length !== 0) {
        const uploadedFile = req.files.flower;

        if (uploadedFile.mimetype !== 'image/jpeg') { // may need to change depending on esp32 img format
            return res.status(400).json({ "error": "Invalid file type" });
        }

        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const uploadPath = path.join(__dirname, '..', 'imgs', `Monitor${monitorId}-${timestamp}.jpg`);

        uploadedFile.mv(uploadPath, (err) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ "error": "Failed to upload image" });
            } else {
                return res.status(200).json({ "success": true });
            }
        });
    } else {
        return res.status(400).json({ "error": "An image was not sent" });
    }
});

module.exports = router;