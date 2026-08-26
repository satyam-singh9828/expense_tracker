const express = require('express');

const cors = require('cors');
const app = express();
const loginRouter = require('./routers/loginrouter.js') ;
const uploadRouter = require('./routers/uploadrouter.js') ;
const prisma = require('./config/prisma') ;

const allowedOrigins = [
    
    'https://expense-tracker-one-rho-41.vercel.app',
    'https://expenseforg.netlify.app',
  
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
app.get('/health/db', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ database: 'ok' });
    } catch (err) {
        console.error('Database health error:', err.code || 'UNKNOWN', err.message);
        res.status(503).json({
            database: 'unavailable',
            code: err.code || err.errorCode || 'UNKNOWN'
        });
    }
});
app.use(loginRouter) ;
app.use('/transactions' , uploadRouter) ;
app.listen(PORT , () => {
    console.log(`Server is running on port ${PORT}`) ;
}) ;



