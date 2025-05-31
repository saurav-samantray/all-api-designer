import { Project, ProjectCreationData, FileEntry } from '@/types/project';

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

/**
 * Fetches the file and directory tree for a specific project.
 * @param projectId - The ID of the project.
 * @returns A promise that resolves to an array of FileEntry objects.
 */
export async function getProjectFiles(projectId: string): Promise<FileEntry[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/files`);
    return await handleResponse<FileEntry[]>(response);
  } catch (error) {
    console.error(`Failed to get files for project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Fetches the content of a specific file within a project.
 * @param projectId - The ID of the project.
 * @param filePath - The relative path of the file within the project.
 * @returns A promise that resolves to the raw string content of the file.
 */
export async function getFileContent(projectId: string, filePath: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/files/content?path=${encodeURIComponent(filePath)}`);
    if (!response.ok) {
      // Try to parse JSON error, but fallback to statusText if not possible or if response is not JSON
      let errorPayload;
      try {
        errorPayload = await response.json();
      } catch (e) {
        errorPayload = { message: response.statusText };
      }
      console.error('API Error fetching file content:', errorPayload);
      throw new Error(errorPayload.message || 'An error occurred while fetching file content.');
    }
    return await response.text(); // Expecting raw text or stringified JSON/YAML
  } catch (error) {
    console.error(`Failed to get content for file ${filePath} in project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Updates the content of a specific file within a project.
 * @param projectId - The ID of the project.
 * @param filePath - The relative path of the file within the project.
 * @param content - The new content for the file (can be a string or an object for JSON/YAML files that backend stringifies/dumps).
 * @returns A promise that resolves to the backend's success response.
 */
export async function updateFileContent(projectId: string, filePath: string, content: string | object): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/files/content?path=${encodeURIComponent(filePath)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json', // Body is always JSON { content: ... }
      },
      body: JSON.stringify({ content: content }), // Backend expects { content: ... }
    });
    return await handleResponse<any>(response); // Expecting a JSON response like { message: ... }
  } catch (error) {
    console.error(`Failed to update content for file ${filePath} in project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Fetches a single project by its ID from the backend.
 * @param projectId - The ID of the project.
 * @returns A promise that resolves to the Project object.
 */
export async function getProjectById(projectId: string): Promise<Project> {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`);
    // handleResponse will throw for non-ok responses, so if project is not found (404), it becomes an error.
    return await handleResponse<Project>(response);
  } catch (error) {
    console.error(`Failed to get project by ID ${projectId}:`, error);
    // Re-throw to be caught by the calling component
    throw error;
  }
}

/**
 * Resolves a $ref string using the backend service.
 * @param projectId - The ID of the project.
 * @param currentFilePath - The path of the file containing the $ref, relative to the project root.
 * @param refString - The $ref string (e.g., '#/components/schemas/User', '../models/User.yaml').
 * @returns A promise that resolves to the parsed JSON content of the resolved reference.
 */
export async function resolveProjectReference(
  projectId: string,
  currentFilePath: string,
  refString: string
): Promise<any> {
  try {
    const params = new URLSearchParams({
      path: currentFilePath,
      ref: refString,
    });
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/resolve-ref?${params.toString()}`);
    // handleResponse is designed to parse JSON, which is what the backend /resolve-ref endpoint returns.
    return await handleResponse<any>(response);
  } catch (error) {
    console.error(
      `Failed to resolve reference "${refString}" in file "${currentFilePath}" for project ${projectId}:`,
      error
    );
    // Re-throw the error so UI components can handle it and display appropriate messages
    throw error;
  }
}
