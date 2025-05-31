import { Project, ProjectCreationData } from '@/types/project';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    console.error('API Error:', errorData);
    throw new Error(errorData.message || 'An error occurred while fetching data.');
  }
  return response.json() as Promise<T>;
}

/**
 * Fetches all projects from the backend.
 * @returns A promise that resolves to an array of Project objects.
 */
export async function getProjects(): Promise<Project[]> {
  try {
    const response = await fetch(\`\${API_BASE_URL}/projects\`);
    return await handleResponse<Project[]>(response);
  } catch (error) {
    console.error('Failed to get projects:', error);
    // Re-throw the error so UI components can handle it
    throw error;
  }
}

/**
 * Creates a new project on the backend.
 * @param projectData - The data for the new project.
 * @returns A promise that resolves to the created Project object.
 */
export async function createProject(projectData: ProjectCreationData): Promise<Project> {
  try {
    const response = await fetch(\`\${API_BASE_URL}/projects\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });
    return await handleResponse<Project>(response);
  } catch (error) {
    console.error('Failed to create project:', error);
    // Re-throw the error so UI components can handle it
    throw error;
  }
}
