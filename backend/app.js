const express = require('express');

const cors = require('cors');
const app = express();
const loginRouter = require('./routers/loginrouter.js') ;
const uploadRouter = require('./routers/uploadrouter.js') ;
app.use(express.json());

app.use(cors()) ;
const bodyParser = require('body-parser') ;
const PORT = process.env.PORT || 3000;
app.use(bodyParser.json()) ;
app.use(bodyParser.urlencoded({extended : true})) ;
app.use(loginRouter) ;
app.use('/transactions' , uploadRouter) ;
app.listen(PORT , () => {
    console.log(`Server is running on port ${PORT}`) ;
}) ;





