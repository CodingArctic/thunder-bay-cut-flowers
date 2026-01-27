const express = require(`express`),
    router = express.Router();

router.post(`/`, async (req, res) => {
    return res.status(200).json({ "imageRoute": true });
});

module.exports = router;