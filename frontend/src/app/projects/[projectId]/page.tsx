"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation'; // For App Router
import { Project, FileEntry } from '@/types/project';
import { getProjects, getProjectFiles } from '@/services/projectService'; // Assuming getProjects can find one, or add getProjectById
import FileTreeNode from '@/components/FileTreeNode';
import Link from 'next/link';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string; // From URL path [projectId]

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(true);
  const [errorProject, setErrorProject] = useState<string | null>(null);
  const [errorFiles, setErrorFiles] = useState<string | null>(null);

  // Placeholder for selected file content, will be used in next step
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string>(''); // Not used in this step
  const [isLoadingFileContent, setIsLoadingFileContent] = useState<boolean>(false); // Not used in this step
  const [errorFileContent, setErrorFileContent] = useState<string | null>(null); // Not used in this step


  useEffect(() => {
    if (!projectId) return;

    // Fetch Project Details
    async function fetchProjectDetails() {
      setIsLoadingProject(true);
      setErrorProject(null);
      try {
        // OPTION 1: Fetch all and find (less efficient for many projects)
        const allProjects = await getProjects();
        const currentProject = allProjects.find(p => p._id === projectId);
        if (currentProject) {
          setProject(currentProject);
        } else {
          setErrorProject('Project not found.');
        }
        // OPTION 2: Implement getProjectById(projectId) in service and backend (more efficient)
        // const currentProject = await getProjectById(projectId);
        // setProject(currentProject);
      } catch (err) {
        setErrorProject(err instanceof Error ? err.message : 'Failed to load project details.');
      } finally {
        setIsLoadingProject(false);
      }
    }

    // Fetch Project Files
    async function fetchProjectFiles() {
      setIsLoadingFiles(true);
      setErrorFiles(null);
      try {
        const projectFiles = await getProjectFiles(projectId);
        setFiles(projectFiles);
      } catch (err) {
        setErrorFiles(err instanceof Error ? err.message : 'Failed to load project files.');
      } finally {
        setIsLoadingFiles(false);
      }
    }

    fetchProjectDetails();
    fetchProjectFiles();
  }, [projectId]);

  const handleFileSelect = (file: FileEntry) => {
    // This function will be expanded in the next step to fetch and display file content
    setSelectedFile(file);
    // setSelectedFileContent(''); // Clear previous content - not needed yet
    // setErrorFileContent(null); // Not needed yet
    console.log('Selected file:', file.path);
    // In next step: fetchFileContent(projectId, file.path);
  };

  if (isLoadingProject) return <div className="p-8 text-center">Loading project details...</div>;
  if (errorProject) return <div className="p-8 text-center text-red-500">Error: {errorProject}</div>;
  if (!project) return <div className="p-8 text-center">Project not found.</div>;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 pb-4 border-b border-gray-300">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{project.name}</h1>
        <p className="text-gray-600">{project.description || 'No description.'}</p>
        <p className="text-sm text-gray-500 mt-1">
          Type: {project.isGitCloned ? \`Git Cloned (\${project.gitUrl})\` : 'Local Project'}
        </p>
        <Link href="/" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          &larr; Back to All Projects
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">File Browser</h2>
          {isLoadingFiles && <p>Loading files...</p>}
          {errorFiles && <p className="text-red-500">Error loading files: {errorFiles}</p>}
          {!isLoadingFiles && !errorFiles && files.length === 0 && <p>No files or directories in this project.</p>}
          {!isLoadingFiles && !errorFiles && files.length > 0 && (
            <div>
              {files.map(node => (
                <FileTreeNode key={node.path} node={node} onFileSelect={handleFileSelect} />
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2 bg-white p-4 rounded-lg shadow min-h-[300px]">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">
            {selectedFile ? \`Content: \${selectedFile.name}\` : 'Select a file to view its content'}
          </h2>
          {/* File content display area - to be implemented in next step */}
          {selectedFile && (
            <div className="mt-2 p-2 border border-gray-200 rounded bg-gray-50 text-sm">
              <p>Path: {selectedFile.path}</p>
              <p>Type: {selectedFile.specInfo?.type || selectedFile.extension || 'N/A'}</p>
              <p>Is Valid: {selectedFile.specInfo?.isValid !== undefined ? String(selectedFile.specInfo.isValid) : 'N/A'}</p>
              <p>Is Spec: {selectedFile.specInfo?.isSpec !== undefined ? String(selectedFile.specInfo.isSpec) : 'N/A'}</p>
              <p className="mt-4"><em>File content will be displayed here in the next step.</em></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
