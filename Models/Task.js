// Task model definition using Mongoose
// Each task belongs to a user and stores basic task information.

const mongoose = require("mongoose");

// Define the structure (schema) of a Task document in MongoDB
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    priority: {
      // Only allow one of: "low", "medium", "high"
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },
    deadline: {
      type: Date
    },
    status: {
      // Only allow one of: "pending", "done"
      type: String,
      enum: ["pending", "done"],
      default: "pending"
    },
    order: {
      // Order index for drag-and-drop sorting
      type: Number,
      default: 0
    },
    userId: {
      // Reference to the User who owns this task (optional for public API)
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    }
  },
  {
    // Add createdAt and updatedAt timestamps automatically
    timestamps: true
  }
);

// Export the Task model so it can be used in routes and other files
module.exports = mongoose.model("Task", taskSchema);


