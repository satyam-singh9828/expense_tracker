const express = require('express') ;
const {signup , Login} = require('../controllers/auth.js') ;
const router = express.Router() ;
router.post('/signup' , signup );
router.post('/login' , Login );


module.exports = router ;
