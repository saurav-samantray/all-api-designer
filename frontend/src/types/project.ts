// Defines the structure of a Project object, mirroring the backend model

export interface Project {
  _id: string; // MongoDB ObjectId as a string
  name: string;
  description?: string; // Optional field
  isGitCloned: boolean;
  gitUrl?: string; // Optional field, only present if isGitCloned is true
  projectPath: string; // Path on the server where project files are stored
  createdAt: string; // ISO date string (e.g., "2023-10-27T10:00:00.000Z")
  // Add any other fields that the backend might return or the frontend might use
}

// Example of how you might define a type for project creation payload
// if it differs significantly (e.g., no _id or createdAt)
export interface ProjectCreationData {
  name: string;
  description?: string;
  gitUrl?: string;
}
