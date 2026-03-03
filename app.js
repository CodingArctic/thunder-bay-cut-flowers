const express = require(`express`),
  cookieParser = require(`cookie-parser`),
  logger = require(`morgan`),
  path = require('path'),
  fileUpload = require('express-fileupload'),

  app = express(),

  recordRouter = require(`./routes/record`),
  loginRouter = require(`./routes/login`),
  registerRouter = require(`./routes/register`),
  { requireAuth } = require(`./routes/auth`),

  staticDir = path.join(__dirname, `client/out`);

app.use(logger(`dev`));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(fileUpload());

// API routes (before auth middleware)
app.use(`/api/login`, loginRouter);
app.use(`/api/register`, registerRouter);
app.use(`/api/record`, recordRouter);

// Authentication middleware (protect private routes)
app.use((req, res, next) => {
  const publicPaths = [
    "/api/login",
    "/api/register",
    "/api/record",
    "/login",
    "/register"
  ];

  // Allow public paths
  const isPublicPath = publicPaths.some(p => req.path === p || req.path.startsWith(p + '/'));

  // Allow static assets (CSS, JS, images, etc.)
  const isStaticAsset = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|map|txt)$/i.test(req.path);

  // Allow Next.js internal files
  const isNextInternal = req.path.startsWith('/_next/');

  if (isPublicPath || isStaticAsset || isNextInternal) {
    return next();
  }

  // Otherwise, require authentication
  return requireAuth(req, res, next);
});

// Serve static frontend files (after auth middleware)
app.use(express.static(staticDir, { 
  extensions: ['html']
}));

// 404 handler for routes not found
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ "error": "Route not found" });
  } else {
    return res.status(404).sendFile(path.join(staticDir, '404.html'));
  }
});

module.exports = app;