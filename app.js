const express = require(`express`),
    cookieParser = require(`cookie-parser`),
    logger = require(`morgan`),
    app = express();

app.use(logger(`dev`));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get(`/`, (req, res) => {
    res.status(200).send({ "success": true });
});

module.exports = app;