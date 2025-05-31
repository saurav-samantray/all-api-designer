# Project Management Frontend (Next.js)

This directory contains the Next.js frontend for the project management application.
It provides the user interface for creating, viewing, and managing projects and their associated files.

## Prerequisites

*   Node.js (v18.x or later recommended, matching the version used by `create-next-app`)
*   npm (usually comes with Node.js)

## Setup

1.  **Navigate to the frontend directory:**
    If you are in the root of the monorepo, change to the frontend directory:
    \`\`\`bash
    cd frontend
    \`\`\`

2.  **Install Dependencies:**
    Install the necessary npm packages:
    \`\`\`bash
    npm install
    \`\`\`

3.  **Set Up Environment Variables:**
    The frontend needs to know the URL of the backend API. Create a `.env.local` file in the `frontend` directory:
    \`\`\`bash
    cp .env.local.example .env.local
    \`\`\`
    If an `.env.local.example` file doesn't exist, create `.env.local` manually with the following content:
    \`\`\`env
    NEXT_PUBLIC_API_URL=http://localhost:3001/api
    \`\`\`
    *   `NEXT_PUBLIC_API_URL`: The full base URL for the backend API. The default assumes the backend is running on port 3001. Adjust if your backend runs elsewhere.

    **Note:** `.env.local` is ignored by Git by default in Next.js projects.

## Running the Development Server

Once the dependencies are installed and the `.env.local` file is configured, you can start the Next.js development server:

\`\`\`bash
npm run dev
\`\`\`

This will typically start the frontend application on `http://localhost:3000`. Open this URL in your web browser to see the application.

## Key Technologies

*   Next.js (App Router)
*   React
*   TypeScript
*   Tailwind CSS
*   ESLint

## Project Structure

*   `src/app/`: Contains the pages and layouts (using Next.js App Router).
*   `src/components/`: Shared UI components.
*   `src/services/`: Modules for making API calls to the backend.
*   `src/types/`: TypeScript type definitions.
*   `public/`: Static assets.
