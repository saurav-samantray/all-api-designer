# Project Management Backend

This directory contains the Express.js backend for the project management application.
It handles project creation (from scratch or by cloning Git repositories), file management, and exposing APIs for the frontend.

## Prerequisites

*   Node.js (v18.x or later recommended)
*   npm (usually comes with Node.js)
*   MongoDB (running locally or accessible via URI)

## Setup

1.  **Clone the repository (if you haven't already):**
    \`\`\`bash
    # git clone <repository_url>
    # cd <repository_directory>/backend
    \`\`\`

2.  **Install Dependencies:**
    Navigate to the `backend` directory and run:
    \`\`\`bash
    npm install
    \`\`\`

3.  **Set Up Environment Variables:**
    Create a `.env` file in the `backend` directory by copying the example or creating it manually.
    \`\`\`bash
    cp .env.example .env
    \`\`\`
    If `.env.example` does not exist, create `.env` with the following content, adjusting values as necessary:
    \`\`\`env
    PORT=3001
    MONGODB_URI=mongodb://localhost:27017/project_management_app
    PROJECTS_DIR_PATH=./projects_data
    # NODE_ENV=development (optional: for development-specific settings like error stacks)
    \`\`\`
    *   `PORT`: The port on which the server will listen.
    *   `MONGODB_URI`: The connection string for your MongoDB instance.
    *   `PROJECTS_DIR_PATH`: The directory where project data (cloned repos, created files) will be stored relative to the `backend` directory.

## Running the Server

Once the dependencies are installed and the `.env` file is configured, you can start the server:

\`\`\`bash
npm start
\`\`\`
This will use the `start` script defined in `package.json`. If it's not defined, you can run `node server.js` directly.

The server will typically be accessible at `http://localhost:3001`.

## API Endpoints

*   `POST /api/projects`: Create a new project.
    *   Body (JSON):
        *   `name` (String, required): Name of the project.
        *   `description` (String, optional): Description of the project.
        *   `gitUrl` (String, optional): URL of a Git repository to clone.
*   `GET /api/projects`: List all projects.

(More endpoints will be documented as they are added.)
