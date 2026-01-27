const express = require(`express`),
    cookieParser = require(`cookie-parser`),
    logger = require(`morgan`),
    createError = require(`http-errors`),
    app = express(),
    
    recordRouter = require(`./routes/record`);

app.use(logger(`dev`));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(`/api/record`, recordRouter);

app.get(`/`, async (req, res) => {
    return res.status(200).send({ "success": true });
});

// redirect any other GET requests to index as fallback
app.get(`/*any`, async (req, res) => {
  return res.redirect(`/`);
});

// catch 404 for non-GET requests (POST, PUT, DELETE, etc.) and forward to error handler
app.use(async (req, res, next) => {
  next(createError(404));
});

module.exports = app;