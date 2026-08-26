const express = require('express') ;
const {signup , Login} = require('../controllers/auth.js') ;
const { loginValidator } = require('../utils/validators.js');
const router = express.Router() ;
router.post('/signup' , signup );
router.post('/login' , loginValidator , Login );


module.exports = router ;
