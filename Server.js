// Main Express server for Smart Task Manager
// This file wires up:
// - Express app and middleware
// - MongoDB connection using Mongoose
// - cookie-session for simple authentication
// - EJS view engine
// - Basic routes for login/logout and task CRUD + API

const express = require("express");
const mongoose = require("mongoose");
const cookieSession = require("cookie-session");
const path = require("path");
const bcrypt = require("bcrypt");
const { body, validationResult, param } = require("express-validator");
require("dotenv").config();

// Load Mongoose models
const User = require("./Models/User");
const Task = require("./Models/Task");

const app = express();
const PORT = process.env.PORT || 3000;

// ====== MongoDB Connection ======
// MONGODB_URI must be set in .env file for security
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("ERROR: MONGODB_URI environment variable is not set!");
  console.error("Please create a .env file with MONGODB_URI=your_connection_string");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    console.error("Server will exit. Please check your MongoDB connection string.");
    process.exit(1);
  });

// Handle MongoDB disconnection
mongoose.connection.on("disconnected", () => {
  console.error("MongoDB disconnected. Attempting to reconnect...");
});

// ====== Middleware Setup ======

// Parse URL-encoded bodies (form submissions) and JSON
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));

// Configure cookie-session to store a simple session object on req.session
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.warn("WARNING: SESSION_SECRET not set. Using default (insecure for production).");
}

app.use(
  cookieSession({
    name: "session",
    keys: [SESSION_SECRET || "dev_secret_key_change_in_production"],
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
    sameSite: "lax"
  })
);

// Set EJS as the view engine and configure views + public folders
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "Views"));
app.use(express.static(path.join(__dirname, "Public")));

// Make user info available in all EJS templates (if logged in)
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// ====== Validation Middleware ======

// Helper to check if ObjectId is valid
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Validation error handler
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// ====== Simple Auth Middleware ======

// Protect routes that require a logged-in user
function requireLogin(req, res, next) {
  if (!req.session.user) {
    // If it's an API request, return JSON error
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    return res.redirect("/login");
  }
  next();
}

// ====== Routes: Pages ======

// Redirect root to dashboard or login depending on auth state
app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.redirect("/login");
});

// Show login form
app.get("/login", (req, res) => {
  // If already logged in, go straight to dashboard
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.render("login", { error: null });
});

// Handle login form submit with proper password authentication
app.post(
  "/login",
  [
    body("username")
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage("Username must be between 3 and 30 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("Username can only contain letters, numbers, and underscores")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("login", {
        error: errors.array()[0].msg
      });
    }

    const { username, password } = req.body;

    try {
      let user = await User.findOne({ username });

      if (!user) {
        // If user does not exist, create a new user with hashed password
        const passwordHash = await bcrypt.hash(password, 10);
        user = new User({
          username,
          passwordHash
        });
        await user.save();
      } else {
        // User exists, verify password
        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
          return res.status(401).render("login", {
            error: "Invalid username or password"
          });
        }
      }

      // Store a minimal user object in the session
      req.session.user = {
        id: user._id.toString(),
        username: user.username
      };

      res.redirect("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      // Handle duplicate key errors
      if (err.code === 11000) {
        return res.status(400).render("login", {
          error: "Username already exists"
        });
      }
      res.status(500).render("login", { error: "Login failed. Try again." });
    }
  }
);

// Log out and clear session
app.post("/logout", (req, res) => {
  req.session = null; // Clear all session data
  res.redirect("/login");
});

// Change password page
app.get("/change-password", requireLogin, (req, res) => {
  const error = req.query.error ? decodeURIComponent(req.query.error) : null;
  const success = req.query.success ? decodeURIComponent(req.query.success) : null;
  res.render("change-password", { error, success });
});

// Change password route
app.post(
  "/change-password",
  requireLogin,
  [
    body("username")
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage("Username must be between 3 and 30 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("Username can only contain letters, numbers, and underscores"),
    body("newPassword")
      .custom((value, { req }) => {
        if (value === req.body.oldPassword) {
          throw new Error("New password must be different from old password");
        }
        return true;
      })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).redirect("/change-password?error=" + encodeURIComponent(errors.array()[0].msg));
    }

    const { username, oldPassword, newPassword } = req.body;

    try {
      // Find user by username
      const user = await User.findOne({ username });

      if (!user) {
        return res.status(400).redirect("/change-password?error=" + encodeURIComponent("Username not found"));
      }

      // Verify old password
      const passwordMatch = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).redirect("/change-password?error=" + encodeURIComponent("Old password is incorrect"));
      }

      // Verify that the username matches the logged-in user
      if (user._id.toString() !== req.session.user.id) {
        return res.status(403).redirect("/change-password?error=" + encodeURIComponent("You can only change your own password"));
      }

      // Hash new password and update
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      user.passwordHash = newPasswordHash;
      await user.save();

      // Redirect with success message
      res.redirect("/change-password?success=Password changed successfully");
    } catch (err) {
      console.error("Change password error:", err);
      res.status(500).redirect("/change-password?error=" + encodeURIComponent("Failed to change password. Try again."));
    }
  }
);

// Dashboard page: shows tasks for the current user
app.get("/dashboard", requireLogin, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.session.user.id }).sort({
      deadline: 1
    });
    const error = req.query.error ? decodeURIComponent(req.query.error) : null;
    const success = req.query.success ? decodeURIComponent(req.query.success) : null;
    res.render("dashboard", { tasks, error, success });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).send("Error loading dashboard");
  }
});

// ====== Routes: Task CRUD (form-based) ======

// Create a new task from a form on the dashboard
app.post(
  "/tasks",
  requireLogin,
  [
    body("title")
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Title must be between 1 and 200 characters")
      .escape(),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage("Description must be less than 2000 characters")
      .escape(),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high"])
      .withMessage("Priority must be low, medium, or high"),
    body("deadline")
      .optional()
      .isISO8601()
      .withMessage("Invalid date format")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // For form submissions, redirect back with error (could be improved with flash messages)
      return res.status(400).redirect("/dashboard?error=" + encodeURIComponent(errors.array()[0].msg));
    }

    const { title, description, priority, deadline } = req.body;
    try {
      await Task.create({
        title: title.trim(),
        description: description ? description.trim() : "",
        priority: priority || "medium",
        deadline: deadline ? new Date(deadline) : undefined,
        userId: req.session.user.id
      });
      res.redirect("/dashboard");
    } catch (err) {
      console.error("Create task error:", err);
      res.status(500).send("Error creating task");
    }
  }
);

// Update a task status or details (simple demo: mark done/pending)
app.post(
  "/tasks/:id/status",
  requireLogin,
  [
    param("id").custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error("Invalid task ID");
      }
      return true;
    }),
    body("status")
      .isIn(["pending", "done"])
      .withMessage("Status must be pending or done")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).redirect("/dashboard?error=" + encodeURIComponent(errors.array()[0].msg));
    }

    const { id } = req.params;
    const { status } = req.body;
    try {
      const task = await Task.findOneAndUpdate(
        { _id: id, userId: req.session.user.id },
        { status },
        { new: true }
      );
      if (!task) {
        return res.status(404).send("Task not found");
      }
      res.redirect("/dashboard");
    } catch (err) {
      console.error("Update task status error:", err);
      res.status(500).send("Error updating task");
    }
  }
);

// Delete a task
app.post(
  "/tasks/:id/delete",
  requireLogin,
  [
    param("id").custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error("Invalid task ID");
      }
      return true;
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).redirect("/dashboard?error=" + encodeURIComponent(errors.array()[0].msg));
    }

    const { id } = req.params;
    try {
      const task = await Task.findOneAndDelete({ _id: id, userId: req.session.user.id });
      if (!task) {
        return res.status(404).send("Task not found");
      }
      res.redirect("/dashboard");
    } catch (err) {
      console.error("Delete task error:", err);
      res.status(500).send("Error deleting task");
    }
  }
);

// ====== RESTful API Endpoints for Tasks ======
// These endpoints return/accept JSON instead of rendering pages.

// GET /api/tasks - list tasks for current user
app.get("/api/tasks", requireLogin, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.session.user.id }).sort({
      deadline: 1
    });
    res.json(tasks);
  } catch (err) {
    console.error("API get tasks error:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// POST /api/tasks - create a new task
app.post(
  "/api/tasks",
  requireLogin,
  [
    body("title")
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Title must be between 1 and 200 characters")
      .escape(),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage("Description must be less than 2000 characters")
      .escape(),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high"])
      .withMessage("Priority must be low, medium, or high"),
    body("deadline")
      .optional()
      .isISO8601()
      .withMessage("Invalid date format")
  ],
  handleValidationErrors,
  async (req, res) => {
    const { title, description, priority, deadline } = req.body;
    try {
      const task = await Task.create({
        title: title.trim(),
        description: description ? description.trim() : "",
        priority: priority || "medium",
        deadline: deadline ? new Date(deadline) : undefined,
        userId: req.session.user.id
      });
      res.status(201).json(task);
    } catch (err) {
      console.error("API create task error:", err);
      res.status(500).json({ error: "Failed to create task" });
    }
  }
);

// PUT /api/tasks/:id - update an existing task
app.put(
  "/api/tasks/:id",
  requireLogin,
  [
    param("id").custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error("Invalid task ID");
      }
      return true;
    }),
    body("title")
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Title must be between 1 and 200 characters")
      .escape(),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage("Description must be less than 2000 characters")
      .escape(),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high"])
      .withMessage("Priority must be low, medium, or high"),
    body("status")
      .optional()
      .isIn(["pending", "done"])
      .withMessage("Status must be pending or done"),
    body("deadline")
      .optional()
      .isISO8601()
      .withMessage("Invalid date format")
  ],
  handleValidationErrors,
  async (req, res) => {
    const { id } = req.params;
    const { title, description, priority, deadline, status } = req.body;

    // Build update object only with provided fields
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;

    try {
      const task = await Task.findOneAndUpdate(
        { _id: id, userId: req.session.user.id },
        updateData,
        { new: true, runValidators: true }
      );
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (err) {
      console.error("API update task error:", err);
      if (err.name === "ValidationError") {
        return res.status(400).json({ error: "Validation error", details: err.message });
      }
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

// DELETE /api/tasks/:id - delete a task
app.delete(
  "/api/tasks/:id",
  requireLogin,
  [
    param("id").custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error("Invalid task ID");
      }
      return true;
    })
  ],
  handleValidationErrors,
  async (req, res) => {
    const { id } = req.params;
    try {
      const task = await Task.findOneAndDelete({
        _id: id,
        userId: req.session.user.id
      });
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ message: "Task deleted" });
    } catch (err) {
      console.error("API delete task error:", err);
      res.status(500).json({ error: "Failed to delete task" });
    }
  }
);

// ====== Start Server ======

app.listen(PORT, () => {
  console.log(`Smart Task Manager server listening on http://localhost:${PORT}`);
});
