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
  password: {
    type: String
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  displayName: {
    type: String
  }
});

// Export the User model so it can be used in routes and other files
module.exports = mongoose.model("User", userSchema);


