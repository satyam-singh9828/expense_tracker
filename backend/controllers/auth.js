require('dotenv').config();
const bcrypt = require('bcrypt') ;
const jwt = require('jsonwebtoken') ;
const { validationResult } = require('express-validator') ;
const { signupValidator } = require('../utils/validators.js') ;
const prisma = require('../config/prisma') ;

const signupHandler = [
    ...signupValidator ,
    async(req , res , next ) => {
            const { firstname , lastname , email , password  } = req.body ;
            const errors = validationResult(req) ;
         if(!errors.isEmpty()){
        return res.status(422).json({errorMessages : errors.array() }) };
        try {
      const hashedPassword = await bcrypt.hash(password , 10) ;
       const user = await prisma.user.create({
        data : {
            firstname , lastname , email , password : hashedPassword 
       }

        }
    )

         res.status(201).json({ status : "success" , user}) ;
  }
  catch(err){
    res.status(500).json({message : err.message}) ;
  }
}]

const Login = async(req , res , next ) => {
    if (req.method === "OPTIONS") {
    return next(); 
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
console.log("Password comparison result:", isPasswordValid);
if(!isPasswordValid){
    return res.status(401).json({message : "Invalid password"}) ;
}
const token = jwt.sign({userId : user.id } , process.env.JWT_SECRET_KEY  , {expiresIn : "12h"}) ;
res.status(200).json({token  ,   user: {
    id: user.id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
  },  }) ;
  }catch(err){
    res.status(500).json({message : err.message}) ;
  }
}



module.exports = {
  signup: signupHandler,
  Login
}

