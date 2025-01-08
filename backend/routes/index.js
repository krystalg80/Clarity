const express = require('express');
const router = express.Router();
const apiRouter = require('./api');

router.use('/api', apiRouter); 

router.get('/api/csrf/restore', (req, res) => {
    const csrfToken = req.csrfToken();
    res.cookie('XSRF-TOKEN', csrfToken);
    res.status(200).json({
        'XSRF-Token': csrfToken
    });
});  
//This route should not be available in production, but it will not be exclusive
//to the production application until you implement the frontend of the
//application later. So for now, it will remain available to both the development
//and production environments.

module.exports = router;