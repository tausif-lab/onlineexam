
const express = require('express');
const path = require('path');
const { connectDB } = require('./config/database');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const cors = require('cors');
const i18n = require('i18n');

const app = express();
const PORT = process.env.PORT || 3001;
i18n.configure({
    locales: ['en', 'hi'], // Add more locales if needed
    directory: path.join(__dirname, 'locales'),
    defaultLocale: 'en',
    queryParameter: 'lang', // allow ?lang=hi in URL
    objectNotation: true
});
app.use(i18n.init);

// Connect to MongoDB
connectDB();
//translation
app.use(express.static('public'));


// Middleware
/*app.use(express.json());
app.use(express.urlencoded({ extended: true }));*/
app.use(express.json({ limit: '50mb' })); // Increased from default 100kb to 50MB
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

app.use(cors());

// Static file serving - ORDER MATTERS!
// Serve uploaded files FIRST (most specific)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Then serve other static directories
app.use(express.static('public'));
app.use(express.static(__dirname)); // Serve files from root directory
app.use(express.static('view'));

// Use routes
app.use(routes);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Admin dashboard: http://localhost:${PORT}/admin-dashboard`);
    console.log(`Manage exams: http://localhost:${PORT}/manage-exams`);
    console.log(`Uploads served from: ${path.join(__dirname, 'uploads')}`);
});

module.exports = app;
