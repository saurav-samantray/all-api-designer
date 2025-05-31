const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Added for ObjectId.isValid
const Project = require('../models/Project'); // Now Project model will be used
const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml'); // For converting JSON to YAML
const fileUtils = require('../utils/fileUtils');

const isValidGitUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return /^(git|ssh|https|http|git@|localhost@)?(:\/\/)?([\w\.@\:/\-~]+)(\.git)?(\/)?$/.test(url);
};

router.post('/', async (req, res, next) => { // Added next for error middleware
  const { name, description, gitUrl } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Project name is required.' });
  }

  const projectsBaseDir = process.env.PROJECTS_DIR_PATH || path.join(__dirname, '..', 'projects_data');
  const sanitizedName = name.replace(/[^a-zA-Z0-9_\-]+/g, '_');
  const uniqueProjectDirName = \`\${Date.now()}_\${sanitizedName}\`;
  const projectPathOnServer = path.resolve(path.join(projectsBaseDir, uniqueProjectDirName)); // Use absolute path

  try {
    let isGitCloned = false;
    let finalGitUrl = null;

    await fs.mkdir(projectsBaseDir, { recursive: true }); // Ensure base directory exists

    if (gitUrl) {
      if (!isValidGitUrl(gitUrl)) {
        return res.status(400).json({ message: 'Invalid Git URL provided.' });
      }
      console.log(\`Cloning from \${gitUrl} into \${projectPathOnServer}...\`);
      // Configure simple-git to use the specific directory
      const git = simpleGit({ baseDir: process.cwd() }); // simpleGit() options can specify base directory for operations
      await git.clone(gitUrl, projectPathOnServer);
      console.log(\`Successfully cloned from \${gitUrl} to \${projectPathOnServer}\`);
      isGitCloned = true;
      finalGitUrl = gitUrl;
    } else {
      console.log(\`Creating directory for non-Git project at \${projectPathOnServer}...\`);
      await fs.mkdir(projectPathOnServer, { recursive: true });
      console.log(\`Successfully created directory at \${projectPathOnServer}\`);
    }

    const newProject = new Project({
      name,
      description,
      isGitCloned,
      gitUrl: finalGitUrl,
      projectPath: projectPathOnServer, // Store the resolved, absolute path
    });

    await newProject.save();
    res.status(201).json(newProject);

  } catch (error) {
    console.error('Error creating project:', error);
    // Attempt to clean up created directory on error
    try {
      const stats = await fs.stat(projectPathOnServer);
      if (stats.isDirectory()) {
        await fs.rm(projectPathOnServer, { recursive: true, force: true });
        console.log(\`Cleaned up directory \${projectPathOnServer} after error.\`);
      }
    } catch (cleanupError) {
      console.error(\`Error during cleanup of \${projectPathOnServer}:\`, cleanupError);
    }
    // Pass the error to the centralized error handler
    next(error);
  }
});

// PUT /api/projects/:projectId/files/content?path=<filepath> - Write/Update content of a specific file
router.put('/:projectId/files/content', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { path: relativeFilepath } = req.query;
    const fileContentFromBody = req.body.content; // Assuming content is in req.body.content

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid Project ID format.' });
    }
    if (!relativeFilepath) {
      return res.status(400).json({ message: 'Filepath query parameter is required.' });
    }
    if (fileContentFromBody === undefined) {
      // Allow empty string for content, but not undefined.
      return res.status(400).json({ message: 'File content is required in the request body as { "content": "..." }.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (!project.projectPath) {
      return res.status(404).json({ message: 'Project path not defined for this project.' });
    }

    const resolvedProjectPath = path.resolve(project.projectPath);
    const resolvedFilepath = path.resolve(resolvedProjectPath, relativeFilepath);

    // Security: Check for directory traversal
    if (!resolvedFilepath.startsWith(resolvedProjectPath + path.sep) && resolvedFilepath !== resolvedProjectPath) {
      console.warn(\`Directory traversal attempt for write: \${resolvedFilepath} is outside of \${resolvedProjectPath}\`);
      return res.status(403).json({ message: 'Access denied: File path is outside project boundaries.' });
    }

    // Check if the path is a directory before writing
    try {
      const stats = await fs.stat(resolvedFilepath);
      if (stats.isDirectory()) {
        return res.status(400).json({ message: 'Specified path is a directory, cannot write content to it.' });
      }
    } catch (error) {
      // ENOENT is fine, means we are creating a new file. Other errors should be handled.
      if (error.code !== 'ENOENT') {
        console.error(\`Error stating file for write \${resolvedFilepath}:\`, error);
        return res.status(500).json({ message: 'Error preparing to write file.' });
      }
    }

    let contentToSave = fileContentFromBody;
    const ext = path.extname(relativeFilepath).toLowerCase();

    // If the file is YAML and the input might be JSON (e.g. from a generic editor component)
    // For now, we assume if it's a .yaml/.yml file, the content *might* need conversion if it's an object/array.
    // A more robust solution might involve a header from client indicating input type.
    if ((ext === '.yaml' || ext === '.yml')) {
      if (typeof fileContentFromBody === 'object' || Array.isArray(fileContentFromBody)) {
        // If client sends parsed JSON for a YAML file
        contentToSave = yaml.dump(fileContentFromBody);
      } else if (typeof fileContentFromBody === 'string') {
        // If client sends a string, assume it's either valid YAML or to be treated as such.
        // We could try to parse it as JSON, if it fails, assume it's a YAML string.
        try {
          JSON.parse(fileContentFromBody); // Check if it's a valid JSON string
          // If it IS a JSON string that needs to be YAML, dump it.
          // This case is tricky: is "{\"foo\": \"bar\"}" a JSON string to be saved as YAML,
          // or a string that happens to be JSON that should be saved literally?
          // For now, if it's a string, save as is. If it's an object/array, dump to YAML.
        } catch (e) {
          // Not a JSON string, assume it's a YAML string or just a plain string.
        }
        contentToSave = fileContentFromBody; // Save string as is for YAML files
      }
    } else if (ext === '.json') {
        if (typeof fileContentFromBody !== 'string') {
            // If it's a JSON file, content should be a stringified JSON
            contentToSave = JSON.stringify(fileContentFromBody, null, 2);
        } else {
            // If it's already a string, validate it's proper JSON
            try {
                JSON.parse(fileContentFromBody);
                // If it's a valid JSON string, ensure it's formatted.
                contentToSave = JSON.stringify(JSON.parse(fileContentFromBody), null, 2);
            } catch (e) {
                return res.status(400).json({ message: 'Invalid JSON content for .json file.' });
            }
        }
    }


    await fs.writeFile(resolvedFilepath, contentToSave, 'utf-8');
    res.status(200).json({ message: 'File saved successfully.', path: relativeFilepath });

  } catch (error) {
    console.error('Error writing file content:', error);
    next(error); // Pass to centralized error handler
  }
});

// GET /api/projects/:projectId/files/content?path=<filepath> - Read content of a specific file
router.get('/:projectId/files/content', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { path: relativeFilepath } = req.query; // req.query.path contains the relative filepath

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid Project ID format.' });
    }
    if (!relativeFilepath) {
      return res.status(400).json({ message: 'Filepath query parameter is required.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (!project.projectPath) {
      return res.status(404).json({ message: 'Project path not defined for this project.' });
    }

    // Security: Resolve the absolute path for project and file
    const resolvedProjectPath = path.resolve(project.projectPath);
    const resolvedFilepath = path.resolve(resolvedProjectPath, relativeFilepath);

    // Security: Check for directory traversal
    // Ensure the resolved file path is still within the project's directory
    if (!resolvedFilepath.startsWith(resolvedProjectPath + path.sep) && resolvedFilepath !== resolvedProjectPath) {
        // The condition also checks if resolvedFilepath is exactly resolvedProjectPath,
        // which would mean they are trying to access the root directory itself as a file.
        // We add path.sep to correctly check subdirectory containment.
      console.warn(\`Directory traversal attempt: \${resolvedFilepath} is outside of \${resolvedProjectPath}\`);
      return res.status(403).json({ message: 'Access denied: File path is outside project boundaries.' });
    }

    let stats;
    try {
      stats = await fs.stat(resolvedFilepath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ message: 'File not found at the specified path.' });
      }
      console.error(\`Error stating file \${resolvedFilepath}:\`, error);
      return res.status(500).json({ message: 'Error accessing file.' });
    }

    if (stats.isDirectory()) {
      return res.status(400).json({ message: 'Specified path is a directory, not a file.' });
    }

    const fileContent = await fs.readFile(resolvedFilepath, 'utf-8');

    // Determine content type (basic for now)
    let contentType = 'text/plain';
    const ext = path.extname(relativeFilepath).toLowerCase();
    if (ext === '.json') {
      contentType = 'application/json';
    } else if (ext === '.yaml' || ext === '.yml') {
      contentType = 'application/x-yaml'; // Or text/yaml, text/vnd.yaml
    } else if (ext === '.xml') {
      contentType = 'application/xml';
    } else if (ext === '.html' || ext === '.htm') {
      contentType = 'text/html';
    } else if (ext === '.js') {
      contentType = 'application/javascript';
    } else if (ext === '.css') {
      contentType = 'text/css';
    }
    // Add more content types as needed

    res.setHeader('Content-Type', contentType);
    res.status(200).send(fileContent);

  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'File not found.' });
    }
    console.error('Error reading file content:', error);
    next(error); // Pass to centralized error handler
  }
});

// Function to recursively read directory contents
async function readDirectoryRecursive(dirPath, relativePath = '') {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const fileTree = [];

  for (const entry of entries) {
    const entryName = entry.name;
    // Skip hidden files/directories like .git, .DS_Store etc.
    if (entryName.startsWith('.')) {
      continue;
    }

    const fullEntryPath = path.join(dirPath, entryName);
    const entryRelativePath = path.join(relativePath, entryName);
    let stats;
    try {
      stats = await fs.stat(fullEntryPath);
    } catch (err) {
      console.warn(`Could not stat file '${fullEntryPath}': ${err.message}`);
      continue; // Skip if cannot stat (e.g. broken symlink)
    }

    if (entry.isDirectory()) {
      fileTree.push({
        name: entryName,
        path: entryRelativePath,
        type: 'directory',
        children: await readDirectoryRecursive(fullEntryPath, entryRelativePath),
        createdAt: stats.birthtime,
        lastModified: stats.mtime,
      });
    } else if (entry.isFile()) {
      const extension = fileUtils.getFileExtension(entryName);
      let specInfo = { type: 'other', version: null, isValid: false, isSpec: false }; // Default specInfo

      if (['.json', '.yaml', '.yml'].includes(extension)) {
        try {
          // Limit file read size for spec identification to avoid reading huge files entirely for just identification.
          // Reading a small chunk (e.g., first 20KB) should be enough for most spec files.
          const fileDescriptor = await fs.open(fullEntryPath, 'r');
          const bufferSize = Math.min(stats.size, 20480); // Read up to 20KB
          const buffer = Buffer.alloc(bufferSize);

          // Check if bufferSize is greater than 0 to avoid error with empty files
          if (bufferSize > 0) {
            await fileDescriptor.read(buffer, 0, bufferSize, 0);
          }
          await fileDescriptor.close();

          // Only attempt to parse if buffer actually contains content
          const rawContentSample = bufferSize > 0 ? buffer.toString('utf-8').trim() : '';

          if (rawContentSample) {
            const parsedContent = fileUtils.parseFileContent(rawContentSample, extension);
            if (parsedContent) {
              specInfo = fileUtils.identifySpecFormat(parsedContent);
              // If identifySpecFormat returns 'unknown' but it's a known extension (json/yaml), refine type.
              if (!specInfo.isSpec) {
                  specInfo.type = extension.substring(1); // e.g., 'json', 'yaml'
              }
              specInfo.isValid = true; // Successfully parsed
            } else {
              // Could not parse (e.g. malformed)
              specInfo.type = extension.substring(1) + '_malformed';
              specInfo.isValid = false;
            }
          } else if (stats.size === 0) { // Handle empty files
            specInfo.type = extension.substring(1) + '_empty';
            specInfo.isValid = true; // Valid in the sense that it's an empty file of this type
          }

        } catch (readParseError) {
          console.warn(`Error reading/parsing file '${fullEntryPath}' for spec identification: ${readParseError.message}`);
          specInfo.type = extension.substring(1) + '_error'; // Indicates error during processing
          specInfo.isValid = false;
        }
      }

      fileTree.push({
        name: entryName,
        path: entryRelativePath,
        type: 'file',
        size: stats.size,
        createdAt: stats.birthtime,
        lastModified: stats.mtime,
        extension: extension, // Keep extension for easier frontend filtering
        specInfo: specInfo     // Add the specInfo object
      });
    }
  }
  // Sort entries: directories first, then files, then alphabetically
  return fileTree.sort((a, b) => {
    if (a.type === 'directory' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
}
// GET /api/projects/:projectId/files - List files and directories in a project
router.get('/:projectId/files', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid Project ID format.' });
    }
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    if (!project.projectPath) {
      return res.status(404).json({ message: 'Project path not defined.' });
    }

    // Ensure projectPath exists and is a directory
    try {
      const stats = await fs.stat(project.projectPath);
      if (!stats.isDirectory()) {
        return res.status(500).json({ message: 'Project path is not a directory.' });
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ message: 'Project directory not found on server.' });
      }
      console.error(\`Error accessing project path \${project.projectPath}:\`, error);
      return res.status(500).json({ message: 'Error accessing project path.' });
    }

    const fileTree = await readDirectoryRecursive(project.projectPath);
    res.status(200).json(fileTree);

  } catch (error) {
    console.error('Error listing project files:', error);
    next(error); // Pass to centralized error handler
  }
});

// GET /api/projects - List all projects
router.get('/', async (req, res, next) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }); // Fetch all projects, sort by newest first
    res.status(200).json(projects);
  } catch (error) {
    console.error('Error listing projects:', error);
    next(error); // Pass error to centralized error handler
  }
});

module.exports = router;
