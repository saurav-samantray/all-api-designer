const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  isGitCloned: {
    type: Boolean,
    default: false,
  },
  gitUrl: {
    type: String,
    trim: true,
    default: null, // Explicitly set default to null for optional fields
  },
  projectPath: { // This will store the path on the server
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Future fields for file structure, etc., can be added later
  // files: [
  //   {
  //     name: String,
  //     pathInProject: String, // Relative path within the projectPath
  //     type: String, // e.g., 'openapi', 'asyncapi', 'json_schema', 'yaml_schema', 'other'
  //     lastModified: Date,
  //   }
  // ]
});

// Ensure projectPath is unique to avoid conflicts if needed,
// or manage uniqueness at the application level when creating paths.
// projectSchema.index({ projectPath: 1 }, { unique: true });

// Ensure name is unique for easier lookup, if required by business logic.
// projectSchema.index({ name: 1 }, { unique: true });


const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
