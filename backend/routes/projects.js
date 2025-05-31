const express = require('express');
const router = express.Router();
const Project = require('../models/Project'); // Now Project model will be used
const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');

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
