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
require("dotenv").config();

// Load Mongoose models
const User = require("./Models/User");
const Task = require("./Models/Task");

const app = express();
const PORT = process.env.PORT || 3000;

// ====== MongoDB Connection ======
// You can set MONGODB_URI in a .env file.
// Fallback is a local MongoDB database named "smart_task_manager".
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smart_task_manager";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// ====== Middleware Setup ======

// Parse URL-encoded bodies (form submissions) and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configure cookie-session to store a simple session object on req.session
app.use(
  cookieSession({
    name: "session",
    // In production you should use environment variables and more secure keys
    keys: [process.env.SESSION_SECRET || "dev_secret_key"],
    maxAge: 24 * 60 * 60 * 1000 // 1 day
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

// ====== Simple Auth Middleware ======

// Protect routes that require a logged-in user
function requireLogin(req, res, next) {
  if (!req.session.user) {
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

// Handle login form submit (very minimal demo logic)
app.post("/login", async (req, res) => {
  const { username, email } = req.body;

  // NOTE: To keep this demo simple, we are NOT hashing or checking real passwords here.
  // For a real project, you must:
  //  - store passwordHash in the database
  //  - use bcrypt to compare the submitted password with the stored hash

  try {
    let user = await User.findOne({ username });

    if (!user) {
      // If user does not exist, create a simple demo user
      user = new User({
        username,
        email: email || `${username}@example.com`,
        passwordHash: "demo-hash" // Placeholder
      });
      await user.save();
    }

    // Store a minimal user object in the session
    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email
    };

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).render("login", { error: "Login failed. Try again." });
  }
});

// Log out and clear session
app.post("/logout", (req, res) => {
  req.session = null; // Clear all session data
  res.redirect("/login");
});

// Dashboard page: shows tasks for the current user
app.get("/dashboard", requireLogin, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.session.user.id }).sort({
      deadline: 1
    });
    res.render("dashboard", { tasks });
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
      title,
      description,
      priority: priority || "medium",
      deadline: deadline ? new Date(deadline) : undefined,
      userId: req.session.user.id
    });
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).send("Error creating task");
  }
});

// Update a task status or details (simple demo: mark done/pending)
app.post("/tasks/:id/status", requireLogin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "pending" or "done"
  try {
    await Task.findOneAndUpdate(
      { _id: id, userId: req.session.user.id },
      { status }
    );
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Update task status error:", err);
    res.status(500).send("Error updating task");
  }
});

// Delete a task
app.post("/tasks/:id/delete", requireLogin, async (req, res) => {
  const { id } = req.params;
  try {
    await Task.findOneAndDelete({ _id: id, userId: req.session.user.id });
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).send("Error deleting task");
  }
});

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
app.post("/api/tasks", requireLogin, async (req, res) => {
  const { title, description, priority, deadline } = req.body;
  try {
    const task = await Task.create({
      title,
      description,
      priority: priority || "medium",
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
  try {
    const task = await Task.findOneAndUpdate(
      { _id: id, userId: req.session.user.id },
      {
        title,
        description,
        priority,
        deadline: deadline ? new Date(deadline) : undefined,
        status
      },
      { new: true }
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


