const { check } = require("express-validator");


/* =========================
   SELLER / USER SIGNUP
========================= */

const signupValidator = [
  check("firstname")
    .notEmpty()
    .withMessage("First name is mandatory")
    .trim()
    .isLength({ min: 2 })
    .withMessage("First name should be minimum 2 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name should only contain alphabets"),

  check("lastname")
    .notEmpty()
    .withMessage("Last name is mandatory")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Last name should be minimum 2 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Last name should only contain alphabets"),

  check("email")
    .notEmpty()
    .withMessage("Email is mandatory")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),

  check("password")
    .isLength({ min: 8 })
    .withMessage("Password should be minimum 8 characters")
    .matches(/[a-z]/)
    .withMessage("Password should have at least one lowercase letter")
    .matches(/[A-Z]/)
    .withMessage("Password should have at least one uppercase letter")
    .matches(/[0-9]/)
    .withMessage("Password should have at least one number")
    .matches(/[!@#$%^&*]/)
    .withMessage("Password should have at least one special character"),

  check("confirmPassword")
    .custom((value, { req }) => {
        console.log("Comparing passwords:", value, req.body.password); // Debugging line
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),

]
/* =========================
   LOGIN VALIDATION
========================= */

const loginValidator = [
  check("email")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),

  check("password")
    .notEmpty()
    .withMessage("Password is required"),
];

/* =========================
   PRODUCT VALIDATION
========================= */

const productValidator = [
  check("name")
    .notEmpty()
    .withMessage("Product name is required")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Product name should be at least 2 characters"),

  check("description")
    .notEmpty()
    .withMessage("Product description is required")
    .isLength({ min: 10 })
    .withMessage("Description should be at least 10 characters"),

  check("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ gt: 0 })
    .withMessage("Price must be greater than 0"),
];

module.exports = {
  signupValidator,
  loginValidator,
  productValidator,
};
