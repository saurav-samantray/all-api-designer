"use client"; // This directive makes it a Client Component

import { useEffect, useState } from 'react';
import { Project } from '@/types/project';
import { getProjects } from '@/services/projectService';
import Link from 'next/link'; // Will be used later for navigation

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedProjects = await getProjects();
        setProjects(fetchedProjects);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred.');
        }
        console.error("Error loading projects:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProjects();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Projects</h1>
          <Link href="/projects/new" legacyBehavior>
            <a
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create New Project
            </a>
          </Link>
        </div>

        {isLoading && <p className="text-gray-600 text-center">Loading projects...</p>}
        {error && <p className="text-red-500 text-center bg-red-100 p-4 rounded-md">Error: {error}</p>}

        {!isLoading && !error && projects.length === 0 && (
          <p className="text-gray-600 text-center">No projects found. Get started by creating one!</p>
        )}

        {!isLoading && !error && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project._id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">{project.name}</h2>
                <p className="text-sm text-gray-500 mb-1">
                  Type: {project.isGitCloned ? 'Git Cloned' : 'Local'}
                </p>
                {project.isGitCloned && project.gitUrl && (
                  <p className="text-sm text-gray-500 mb-1 truncate" title={project.gitUrl}>
                    Repo: <a href={project.gitUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{project.gitUrl}</a>
                  </p>
                )}
                <p className="text-gray-600 text-sm mb-3 line-clamp-3" title={project.description}>
                  {project.description || 'No description available.'}
                </p>
                <p className="text-xs text-gray-400">
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </p>
                {/* Placeholder for future actions like 'Open Project' */}
                {/* <div className="mt-4">
                  <button className="text-sm text-blue-500 hover:underline">Open Project</button>
                </div> */}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
