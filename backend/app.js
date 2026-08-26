const express = require('express');

const cors = require('cors');
const app = express();
const loginRouter = require('./routers/loginrouter.js') ;
const uploadRouter = require('./routers/uploadrouter.js') ;

const allowedOrigins = [
    'https://expenseforg.netlify.app',
    'https://imaginative-shortbread-bd5597.netlify.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL
].filter(Boolean).map((origin) => origin.replace(/\/$/, ''));

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
            callback(null, true);
            return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
})) ;
app.use(express.json());
const bodyParser = require('body-parser') ;
const PORT = process.env.PORT || 3000;
app.use(bodyParser.json()) ;
app.use(bodyParser.urlencoded({extended : true})) ;
app.get('/', (req, res) => {
    res.json({
        message: 'Expense tracker backend is running',
        service: 'expense-tracker-api'
    });
});
app.use(loginRouter) ;
app.use('/transactions' , uploadRouter) ;
app.listen(PORT , () => {
    console.log(`Server is running on port ${PORT}`) ;
}) ;




