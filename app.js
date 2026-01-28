const express = require(`express`),
    cookieParser = require(`cookie-parser`),
    logger = require(`morgan`),
    path = require('path'),

    app = express(),
    
    recordRouter = require(`./routes/record`),
    
    staticDir = path.join(__dirname, `client/out`);

app.use(logger(`dev`));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(`/api/record`, recordRouter);

// serve static frontend files
app.use(express.static(staticDir, { extensions: ['html'] }));

// redirect any other GET requests to index as fallback
app.get(`/*any`, async (req, res) => {
  return res.redirect(`/`);
});

// catch 404 for non-GET requests (POST, PUT, DELETE, etc.) and forward to error handler
app.use(async (req, res, next) => {
  return res.status(404).json({ "error": "Route not found" });
});

module.exports = app;