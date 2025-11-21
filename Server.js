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
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const path = require("path");
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

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || `http://localhost:${PORT}/auth/google/callback`;
const googleAuthEnabled = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

if (!googleAuthEnabled) {
  console.warn("Google OAuth not fully configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.");
}

// When running behind a proxy (e.g. Render, Heroku), trust the first proxy so secure cookies work
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
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

app.use(passport.initialize());

if (googleAuthEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            const fallbackUsername =
              (profile.emails && profile.emails[0] && profile.emails[0].value) ||
              profile.displayName ||
              `google_${profile.id}`;

            user = await User.create({
              username: fallbackUsername,
              password: "",
              googleId: profile.id,
              displayName: profile.displayName || fallbackUsername
            });
          } else if (!user.displayName && profile.displayName) {
            user.displayName = profile.displayName;
            await user.save();
          }

          return done(null, {
            id: user._id.toString(),
            username: user.username,
            displayName: user.displayName || user.username,
            googleUser: true
          });
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

// Set EJS as the view engine and configure views + public folders
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "Views"));
app.use(express.static(path.join(__dirname, "Public")));

// Make user info available in all EJS templates (if logged in)
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// ====== Simple Auth Middleware ======

// Protect routes that require a logged-in user
function requireLogin(req, res, next) {
  if (!req.session.user) {
    // If it's an API request, return JSON error
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({ 
        error: "Authentication required",
        message: "Your session has expired. Please log in again."
      });
    }
    // For web requests, redirect with error message
    return res.redirect("/login?error=" + encodeURIComponent("Your session has expired. Please log in again."));
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
  const error = req.query.error ? decodeURIComponent(req.query.error) : null;
  res.render("login", { error });
});

// Handle login form submit (simple password check)
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render("login", { error: "Please enter both username and password." });
  }

  try {
    const user = await User.findOne({ username });

    if (!user || user.password !== password) {
      return res.render("login", { error: "Invalid username or password." });
    }

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName || user.username
    };

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    res.render("login", { error: "Login failed. Try again later." });
  }
});

// Show register form
app.get("/register", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  const error = req.query.error ? decodeURIComponent(req.query.error) : null;
  res.render("register", { error });
});

// Handle registration (simple create)
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render("register", { error: "Please choose a username and password." });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.render("register", { error: "Username already exists." });
    }

    const user = await User.create({ username, password, displayName: username });

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName || user.username
    };

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Register error:", err);
    res.render("register", { error: "Registration failed. Try again later." });
  }
});

// Google OAuth routes
app.get("/auth/google", (req, res, next) => {
  if (!googleAuthEnabled) {
    return res.redirect("/login?error=" + encodeURIComponent("Google login is not configured."));
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
  })(req, res, next);
});

app.get("/auth/google/callback", (req, res, next) => {
  if (!googleAuthEnabled) {
    return res.redirect("/login?error=" + encodeURIComponent("Google login is not configured."));
  }
  passport.authenticate("google", { session: false }, (err, userProfile) => {
    if (err || !userProfile) {
      console.error("Google login error:", err);
      return res.redirect("/login?error=" + encodeURIComponent("Google login failed. Please try again."));
    }

    req.session.user = userProfile;
    res.redirect("/dashboard");
  })(req, res, next);
});

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
app.post("/change-password", requireLogin, async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  if (!username || !oldPassword || !newPassword) {
    return res.redirect("/change-password?error=" + encodeURIComponent("All fields are required"));
  }

  try {
    const user = await User.findOne({ username });

    if (!user || user._id.toString() !== req.session.user.id) {
      return res.redirect("/change-password?error=" + encodeURIComponent("You can only change your own password"));
    }

    if (!user.password) {
      return res.redirect("/change-password?error=" + encodeURIComponent("Google accounts cannot change password here"));
    }

    if (user.password !== oldPassword) {
      return res.redirect("/change-password?error=" + encodeURIComponent("Old password is incorrect"));
    }

    user.password = newPassword;
    await user.save();

    res.redirect("/change-password?success=Password changed successfully");
  } catch (err) {
    console.error("Change password error:", err);
    res.redirect("/change-password?error=" + encodeURIComponent("Failed to change password. Try again later."));
  }
});

// Dashboard page: shows tasks for the current user
app.get("/dashboard", requireLogin, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.session.user.id }).sort({
      order: 1,
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
app.post("/tasks", requireLogin, async (req, res) => {
  const { title, description, priority, deadline } = req.body;
  try {
    await Task.create({
      title: (title || "Untitled Task").toString(),
      description: description ? description.toString() : "",
      priority: priority ? priority.toString() : "medium",
      deadline: deadline ? new Date(deadline) : undefined,
      userId: req.session.user.id
    });
    res.redirect("/dashboard?success=" + encodeURIComponent("Task created successfully!"));
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).redirect("/dashboard?error=" + encodeURIComponent("Failed to create task. Please try again."));
  }
});

// Update a task status or details (simple demo: mark done/pending)
app.post("/tasks/:id/status", requireLogin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const task = await Task.findOneAndUpdate(
      { _id: id, userId: req.session.user.id },
      { status: status || "pending" },
      { new: true }
    );
    if (!task) {
      return res.redirect("/dashboard?error=" + encodeURIComponent("Task not found"));
    }
    res.redirect("/dashboard?success=" + encodeURIComponent("Task status updated successfully!"));
  } catch (err) {
    console.error("Update task status error:", err);
    res.status(500).redirect("/dashboard?error=" + encodeURIComponent("Failed to update task. Please try again."));
  }
});

// Delete a task
app.post("/tasks/:id/delete", requireLogin, async (req, res) => {
  const { id } = req.params;
  try {
    const task = await Task.findOneAndDelete({ _id: id, userId: req.session.user.id });
    if (!task) {
      return res.redirect("/dashboard?error=" + encodeURIComponent("Task not found"));
    }
    res.redirect("/dashboard?success=" + encodeURIComponent("Task deleted successfully!"));
  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).redirect("/dashboard?error=" + encodeURIComponent("Failed to delete task. Please try again."));
  }
});

// ====== RESTful API Endpoints for Tasks ======
// These endpoints return/accept JSON instead of rendering pages.

// GET /api/tasks - list tasks for current user
app.get("/api/tasks", requireLogin, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.session.user.id }).sort({
      order: 1,
      deadline: 1
    });
    res.json(tasks);
  } catch (err) {
    console.error("API get tasks error:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// POST /api/tasks/reorder - update task order after drag-and-drop
app.post("/api/tasks/reorder", requireLogin, async (req, res) => {
  const { taskIds } = req.body;

  if (!Array.isArray(taskIds)) {
    return res.status(400).json({ error: "taskIds must be an array" });
  }

  try {
    const userId = req.session.user.id;
    const tasks = await Task.find({
      _id: { $in: taskIds },
      userId: userId
    });

    if (tasks.length !== taskIds.length) {
      return res.status(403).json({ error: "Some tasks not found or unauthorized" });
    }

    const updatePromises = taskIds.map((taskId, index) => {
      return Task.updateOne({ _id: taskId, userId: userId }, { order: index });
    });

    await Promise.all(updatePromises);
    res.json({ message: "Tasks reordered successfully" });
  } catch (err) {
    console.error("API reorder tasks error:", err);
    res.status(500).json({ error: "Failed to reorder tasks" });
  }
});

// POST /api/tasks - create a new task
app.post("/api/tasks", requireLogin, async (req, res) => {
  const { title, description, priority, deadline } = req.body;
  try {
    const task = await Task.create({
      title: (title || "Untitled Task").toString(),
      description: description ? description.toString() : "",
      priority: priority ? priority.toString() : "medium",
      deadline: deadline ? new Date(deadline) : undefined,
      userId: req.session.user.id
    });
    res.status(201).json(task);
  } catch (err) {
    console.error("API create task error:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// PUT /api/tasks/:id - update an existing task
app.put("/api/tasks/:id", requireLogin, async (req, res) => {
  const { id } = req.params;
  const { title, description, priority, deadline, status } = req.body;

  const updateData = {};
  if (title !== undefined) updateData.title = title.toString();
  if (description !== undefined) updateData.description = description.toString();
  if (priority !== undefined) updateData.priority = priority.toString();
  if (status !== undefined) updateData.status = status.toString();
  if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;

  try {
    const task = await Task.findOneAndUpdate(
      { _id: id, userId: req.session.user.id },
      updateData,
      { new: true, runValidators: false }
    );
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  } catch (err) {
    console.error("API update task error:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// DELETE /api/tasks/:id - delete a task
app.delete("/api/tasks/:id", requireLogin, async (req, res) => {
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
});

// ====== Start Server ======

app.listen(PORT, () => {
  console.log(`Smart Task Manager server listening on http://localhost:${PORT}`);
});
