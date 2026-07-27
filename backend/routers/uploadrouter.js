const express = require('express');
const { uploadTransactions , getTransactions , getanalytics } = require('../controllers/uploadTransaction.js');
const  {upload}  = require('../middleware/upload.js');
const {isLoggedIn} = require('../middleware/authentication.js') ;
const router = express.Router();
 console.log("isLoggedIn:", isLoggedIn), 
console.log("uploadTransaction:", uploadTransactions) , 
router.post(
  "/upload",

  upload.single("file"),
  isLoggedIn,
  uploadTransactions
);
router.get("/transactions", isLoggedIn, getTransactions);
router.get("/transactions/analytics", isLoggedIn, getanalytics);
module.exports = router;
