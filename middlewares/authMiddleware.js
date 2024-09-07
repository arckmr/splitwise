const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Authentication middleware
const authMiddleware = async (req, res, next) => {
  // Get the token from the headers
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.userId; // Attach user ID to request

    // Check if the user exists
    const user = await User.findById(req.user);
    if (!user) {
      return res
        .status(401)
        .json({ message: "User not found, authorization denied" });
    }

    next(); // Proceed to the next middleware/controller
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = authMiddleware;
