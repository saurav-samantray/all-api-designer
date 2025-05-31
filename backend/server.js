require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const projectRoutes = require('./routes/projects'); // Import project routes

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(express.json()); // Middleware to parse JSON bodies

// Basic request logger middleware
app.use((req, res, next) => {
  console.log(\`\${new Date().toISOString()} - \${req.method} \${req.path}\`);
  next();
});

// API Routes
app.use('/api/projects', projectRoutes); // Mount project routes

// Root path response
app.get('/', (req, res) => {
  res.send('Backend server is running and API is accessible under /api');
});

// Basic Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack || err.message || err);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected error occurred.',
    // Optionally include stack trace in development
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// 404 Handler for unhandled routes
app.use((req, res, next) => {
  res.status(404).json({ message: \`Route not found: \${req.method} \${req.originalUrl}\` });
});


// Connect to MongoDB
if (!MONGODB_URI) {
  console.error('FATAL ERROR: MONGODB_URI is not defined in .env file.');
  // process.exit(1); // Exit if DB URI is not set, or handle differently
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    app.listen(PORT, () => {
      console.log(\`Server is listening on port \${PORT}\`);
      console.log(\`Connected to database: \${MONGODB_URI}\`);
      console.log(\`Projects data will be stored in: \${process.env.PROJECTS_DIR_PATH}\`)
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    // Depending on the strategy, you might want to exit or retry connection
    process.exit(1); // Exit on connection failure
  });

// Export app for potential testing or programmatic use (optional)
// module.exports = app;
