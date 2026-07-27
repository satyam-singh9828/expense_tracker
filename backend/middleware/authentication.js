const jwt = require("jsonwebtoken");

// Check if user is authenticated
module.exports.isLoggedIn = (req, res, next) => {
  const authHeader = req.headers.authorization;


  // Check Authorization header
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authorization header missing or malformed",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Authentication token is missing",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Attach user data to request object
    req.user = {
      id : decoded.userId , 
    }
   

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired authentication token",
    });
  }
};