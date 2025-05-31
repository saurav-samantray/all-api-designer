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



// Information about the identified specification of a file
export interface SpecInfo {
  type: string;       // e.g., 'openapi', 'asyncapi', 'json_schema', 'json', 'yaml', 'json_malformed', 'other'
  version: string | null;
  isValid: boolean;   // Was the file content parsable / does it conform to basic structure?
  isSpec: boolean;    // Is it one of the recognized specific specifications (openapi, asyncapi, json_schema)?
}

// Represents a file or directory entry in a project's file tree
export interface FileEntry {
  name: string;
  path: string;        // Relative path from the project root
  type: 'file' | 'directory';
  size?: number;       // For files
  createdAt: string;   // ISO date string
  lastModified: string; // ISO date string
  extension?: string;  // For files, e.g., '.json', '.yaml'
  specInfo?: SpecInfo; // For files, especially if they are specs
  children?: FileEntry[]; // For directories, contains nested FileEntry objects
}
