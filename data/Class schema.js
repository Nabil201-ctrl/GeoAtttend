const mongoose = require('mongoose');

// Class schema: This schema holds information about classes that are linked to lecturers and students.
const classSchema = new mongoose.Schema({
  // Name of the class (e.g., "Math 101")
  name: { type: String, required: true },

  // Subject that the class is related to (e.g., "Mathematics")
  subject: { type: String, required: true },

  // Reference to the lecturer who is teaching the class
  // Use ObjectId to reference the User model
  lecturer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // List of students enrolled in the class (students are references to the User model)
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Automatically set the creation date for the class
  createdAt: { type: Date, default: Date.now },
});

// Create a model for Class and export it
const Class = mongoose.model('Class', classSchema);
module.exports = Class;
