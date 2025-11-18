// User model definition using Mongoose
// This model stores basic authentication information for each user.

const mongoose = require("mongoose");

// Define the structure (schema) of a User document in MongoDB
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  passwordHash: {
    // We store a hash of the password, NOT the plain text password
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  }
});

// Export the User model so it can be used in routes and other files
module.exports = mongoose.model("User", userSchema);


