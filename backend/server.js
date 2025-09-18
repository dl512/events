require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
// Configure CORS to allow requests from any origin in development and production
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static files from the parent directory (frontend files)
app.use(express.static(path.join(__dirname, '..')));

// MongoDB connection with retry logic
const connectWithRetry = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    console.log("Retrying connection in 5 seconds...");
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

// Add request logging middleware
app.use((req, res, next) => {
  console.log("=== Incoming Request ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", req.headers);
  console.log("======================");
  next();
});

// User schema
const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    savedActivities: {
      type: [String], // Array of unique activity codes from Column N
      default: [],
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// Middleware to authenticate tokens
function authenticateToken(req, res, next) {
  console.log("=== Authentication Check ===");
  console.log("Request URL:", req.url);
  console.log("Request headers:", req.headers);

  const authHeader = req.headers["authorization"];
  console.log("Auth header:", authHeader);

  if (!authHeader) {
    console.log("No authorization header found");
    return res.status(401).json({ error: "No authorization header" });
  }

  const token = authHeader.split(" ")[1];
  console.log("Token:", token ? "Present" : "Missing");

  if (!token) {
    console.log("No token found in authorization header");
    return res.status(401).json({ error: "No token provided" });
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      console.log("Token verification failed:", err.message);
      return res.status(403).json({ error: "Invalid token" });
    }
    console.log("Token verified successfully. User:", user);
    req.user = user;
    next();
  });
}

// Register user
app.post("/api/auth/register", async (req, res) => {
  console.log("\n=== Registration Request Start ===");
  console.log("Full request body:", JSON.stringify(req.body, null, 2));
  const { userId, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ userId });
    if (existingUser) {
      return res.status(400).send("User ID is already taken");
    }

    // Create user
    console.log("\n1. Creating user...");
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      userId,
      password: hashedPassword,
    });
    const savedUser = await newUser.save();
    console.log("User created with ID:", savedUser._id);

    // Generate token for the new user
    const token = jwt.sign(
      { id: savedUser._id, userId: savedUser.userId },
      process.env.SECRET_KEY,
      { expiresIn: "7d" }
    );

    console.log("\n=== Registration Request Complete ===");
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: savedUser._id,
        userId: savedUser.userId,
      },
    });
  } catch (error) {
    console.error("\n=== Registration Error ===");
    console.error("Error details:", error);
    res.status(400).send("Error registering user: " + error.message);
  }
});

// Login user
app.post("/api/auth/login", async (req, res) => {
  const { userId, password } = req.body;

  try {
    const user = await User.findOne({ userId });
    if (!user) return res.status(401).send("Invalid credentials");

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).send("Invalid credentials");

    const token = jwt.sign(
      { id: user._id, userId: user.userId },
      process.env.SECRET_KEY,
      { expiresIn: "7d" }
    );
    res.json({
      token,
      user: {
        id: user._id,
        userId: user.userId,
      },
    });
  } catch (error) {
    res.status(500).send("Error logging in: " + error.message);
  }
});

// Get user's saved activities
app.get("/api/activities/saved", authenticateToken, async (req, res) => {
  try {
    console.log("\n=== Fetching Saved Activities ===");
    console.log("User ID:", req.user.userId);

    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Found saved activities:", user.savedActivities.length);

    res.json({
      success: true,
      savedActivities: user.savedActivities,
    });
  } catch (error) {
    console.error("Error fetching saved activities:", error);
    res.status(500).json({
      error: "Error fetching saved activities",
      message: error.message,
    });
  }
});

// Save/unsave an activity
app.post("/api/activities/save", authenticateToken, async (req, res) => {
  try {
    console.log("\n=== Save Activity Request Start ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("User:", req.user);

    const { activityId } = req.body;

    if (!activityId) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "activityId is required",
      });
    }

    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already saved
    const isAlreadySaved = user.savedActivities.includes(activityId);

    if (isAlreadySaved) {
      // Remove if already saved
      user.savedActivities = user.savedActivities.filter(
        (id) => id !== activityId
      );
      await user.save();
      console.log("Activity removed from saved list");
      res.json({
        success: true,
        saved: false,
        message: "Activity removed from saved list",
      });
    } else {
      // Add if not saved
      user.savedActivities.push(activityId);
      await user.save();
      console.log("Activity saved successfully");
      res.json({
        success: true,
        saved: true,
        message: "Activity saved successfully",
      });
    }

    console.log("=== Save Activity Request Complete ===\n");
  } catch (error) {
    console.error("\n=== Save Activity Error ===");
    console.error("Error details:", error);
    res.status(500).json({
      error: "Error saving activity",
      message: error.message,
    });
  }
});

// Check if activity is saved
app.get("/api/activities/check", authenticateToken, async (req, res) => {
  try {
    const { activityId } = req.query;

    if (!activityId) {
      return res.status(400).json({
        error: "Missing activityId",
        message: "activityId query parameter is required",
      });
    }

    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const saved = user.savedActivities.includes(activityId);

    res.json({
      success: true,
      saved: saved,
    });
  } catch (error) {
    console.error("Error checking saved activity:", error);
    res.status(500).json({
      error: "Error checking activity",
      message: error.message,
    });
  }
});

// Add a test route
app.get("/api/test", (req, res) => {
  console.log("Test route hit");
  res.json({ message: "XPLORE Hong Kong API working" });
});

// Debug route to check database contents
app.get("/api/debug/users", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }); // Exclude password field
    res.json({ users, count: users.length });
  } catch (error) {
    console.error("Debug users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("=== Global Error Handler ===");
  console.error("Error:", err);
  console.error("Request URL:", req.url);
  console.error("Request Method:", req.method);
  console.error("Request Headers:", req.headers);
  console.error("========================");

  res.status(500).json({
    error: "Internal server error",
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Add a catch-all route for undefined routes - MUST BE LAST
app.use((req, res) => {
  console.log("=== 404 - Route Not Found ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", req.headers);
  console.log("==========================");

  res.status(404).json({
    error: "Route not found",
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  });
});

// Start the server
const PORT = process.env.PORT || 10000;

// Enable trust proxy for production
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
