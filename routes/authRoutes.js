const express = require("express");
const authController = require("../controllers/authController");
const router = express.Router();

router.post("/login", authController.login);
router.post("/signup", authController.signup);

router.post("/generate-otp", authController.generateOtp);
router.post("/login-otp", authController.loginWithOtp);

module.exports = router;
