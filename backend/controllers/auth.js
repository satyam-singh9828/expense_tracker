require('dotenv').config();
const bcrypt = require('bcrypt') ;
const jwt = require('jsonwebtoken') ;
const { validationResult } = require('express-validator') ;
const { signupValidator } = require('../utils/validators.js') ;
const prisma = require('../config/prisma') ;

function buildAuthUser(user) {
  return {
    id: user.id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
  };
}

function sendAuthError(res, err, fallbackMessage = "Authentication failed") {
  const errorCode = err.code || err.errorCode;
  const errorMessage = String(err.message || "");

  console.error("Auth error:", errorCode || "UNKNOWN", errorMessage);

  if (
    errorMessage.includes("Environment variable not found: DATABASE_URL") ||
    errorMessage.includes("Invalid value undefined for datasource") ||
    errorMessage.includes("error: Environment variable not found")
  ) {
    return res.status(503).json({
      message: "Database is not configured on the backend server.",
    });
  }

  if (
    errorCode === "P1000" ||
    errorCode === "P1001" ||
    errorCode === "P1003" ||
    errorMessage.includes("Can't reach database server")
  ) {
    return res.status(503).json({
      message: "Database is unavailable. Please try again later.",
    });
  }

  if (errorCode === "P2002") {
    return res.status(409).json({
      message: "An account with this email already exists",
    });
  }

  if (errorCode === "P2021" || errorCode === "P2022") {
    return res.status(503).json({
      message: "Database schema is not ready. Please run backend migrations.",
    });
  }

  return res.status(500).json({ message: fallbackMessage });
}

const signupHandler = [
    ...signupValidator ,
    async(req , res ) => {
            const { firstname , lastname , email , password  } = req.body ;
            const errors = validationResult(req) ;
         if(!errors.isEmpty()){
        return res.status(422).json({errorMessages : errors.array() }) };
        try {
      const existingUser = await prisma.user.findUnique({ where: { email } });

      if (existingUser) {
        return res.status(409).json({
          message: "An account with this email already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password , 10) ;
       const user = await prisma.user.create({
        data : {
            firstname , lastname , email , password : hashedPassword 
       }

        }
    )

         res.status(201).json({ status : "success" , user: buildAuthUser(user)}) ;
  }
  catch(err){
    return sendAuthError(res, err, "Could not create account") ;
  }
}]

const Login = async(req , res , next ) => {
    if (req.method === "OPTIONS") {
    return next(); 
  }
  const errors = validationResult(req);

  if(!errors.isEmpty()){
    return res.status(422).json({errorMessages : errors.array() });
  }

  const {email , password } = req.body ;
  if(!email || !password){
      return res.status(400).json({message : "Email and password are required"}) ;
  }
  try{
    const user = await prisma.user.findUnique({where : {email}});
  
if(!user){
    return res.status(404).json({message : "User not found"}) ;
}
const isPasswordValid = await bcrypt.compare(password , user.password) ;
if(!isPasswordValid){
    return res.status(401).json({message : "Invalid password"}) ;
}
const token = jwt.sign({userId : user.id } , process.env.JWT_SECRET_KEY  , {expiresIn : "12h"}) ;
res.status(200).json({token  , user: buildAuthUser(user) }) ;
  }catch(err){
    return sendAuthError(res, err, "Could not login") ;
  }
}



module.exports = {
  signup: signupHandler,
  Login
}

