const express = require('express');
const router = express.Router();
const apiRouter = require('./api');

router.use('/api', apiRouter); 
// Static routes
// Serve React build files in production
if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    // Serve the frontend's index.html file at the root route
    router.get('/', (req, res) => {
      res.cookie('XSRF-TOKEN', req.csrfToken());
      return res.sendFile(
        path.resolve(__dirname, '../../frontend', 'dist', 'index.html')
      );
    });
  
    // Serve the static assets in the frontend's build folder
    router.use(express.static(path.resolve("../frontend/dist")));
  
    // Serve the frontend's index.html file at all other routes NOT starting with /api
    router.get(/^(?!\/?api).*/, (req, res) => {
      res.cookie('XSRF-TOKEN', req.csrfToken());
      return res.sendFile(
        path.resolve(__dirname, '../../frontend', 'dist', 'index.html')
      );
    });
  }

// Add a XSRF-TOKEN cookie in development
if (process.env.NODE_ENV !== 'production') {
    router.get('/api/csrf/restore', (req, res) => {
      res.cookie('XSRF-TOKEN', req.csrfToken());
      return res.json({});
    });
  }
  
if(process.env.NODE_ENV === 'production') {
router.get('/api/csrf/restore', (req, res) => {
    const csrfToken = req.csrfToken();
    res.cookie('XSRF-TOKEN', csrfToken);
    res.status(200).json({
        'XSRF-Token': csrfToken
    });
});  
}
//This route should not be available in production, but it will not be exclusive
//to the production application until you implement the frontend of the
//application later. So for now, it will remain available to both the development
//and production environments.

module.exports = router;