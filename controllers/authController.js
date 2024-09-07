const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Signup API
exports.signup = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password before saving
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create a new user
    user = new User({
      email,
      password: hashedPassword,
    });

    // Save the new user to the database
    await user.save();

    // Create a JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1y",
    });

    // Return the token
    res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

//login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create a JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1y",
    });

    // Return the token
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// API to generate and send OTP
exports.generateOtp = async (req, res) => {
  const { email } = req.body;

  try {
    let user = await User.findOne({ email });

    // Generate a new OTP and expiration time (5 minutes validity)
    const otp = 1111;
    const otpExpiration = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    if (!user) {
      // If the user doesn't exist, create a new one
      user = new User({
        email,
        otp,
        otpExpiration,
      });
      await user.save();
    } else {
      // If the user exists, update the OTP and expiration time
      user.otp = otp;
      user.otpExpiration = otpExpiration;
      await user.save();
    }

    // For simplicity, returning the OTP in the response (you should send it via email/SMS in a real app)
    res.json({ message: "OTP generated" });
  } catch (error) {
    console.log(error, "genrate otp error");
    res.status(500).json({ message: "Server error", error });
  }
};

// API to login using OTP
exports.loginWithOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check if OTP is valid and not expired
    if (user.otp != otp || user.otpExpiration < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1y",
    });

    // Clear the OTP after successful login
    user.otp = null;
    user.otpExpiration = null;
    await user.save();

    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
