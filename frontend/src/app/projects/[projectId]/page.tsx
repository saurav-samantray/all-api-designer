"use client";

import { useEffect, useState, useRef } from 'react'; // Added useRef
import { useParams } from 'next/navigation';
import { Project, FileEntry, SpecInfo } from '@/types/project'; // Added SpecInfo just in case, though FileEntry has it
import { getProjects, getProjectFiles, getFileContent, updateFileContent } from '@/services/projectService';
import FileTreeNode from '@/components/FileTreeNode';
import JsonSchemaEditor from '@/components/editors/JsonSchemaEditor'; // Import the editor
import Link from 'next/link';
import * as yaml from 'js-yaml'; // For parsing YAML schemas

// Define a type for the form data, typically any object
type FormData = Record<string, any>;

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(true);
  const [errorProject, setErrorProject] = useState<string | null>(null);
  const [errorFiles, setErrorFiles] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string>(''); // Raw string content
  const [isLoadingFileContent, setIsLoadingFileContent] = useState<boolean>(false);
  const [errorFileContent, setErrorFileContent] = useState<string | null>(null);

  // State for editing
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentFormData, setCurrentFormData] = useState<FormData | null>(null); // Parsed object for the editor
  const [editorSchema, setEditorSchema] = useState<any>(null); // Parsed schema for the editor itself
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Ref for RJSF form if needed for programmatic submission (optional for now)
  // const rjsfFormRef = useRef<any>(null);


  useEffect(() => {
    if (!projectId) return;
    // Reset editing state when projectId changes
    setIsEditing(false);
    setCurrentFormData(null);
    setEditorSchema(null);
    setSelectedFile(null); // Also reset selected file
    setSelectedFileContent('');


    async function fetchProjectDetails() {
      setIsLoadingProject(true);
      setErrorProject(null);
      try {
        const allProjects = await getProjects(); // TODO: Replace with getProjectById if implemented
        const currentProject = allProjects.find(p => p._id === projectId);
        if (currentProject) {
          setProject(currentProject);
        } else {
          setErrorProject('Project not found.');
        }
      } catch (err) {
        setErrorProject(err instanceof Error ? err.message : 'Failed to load project details.');
      } finally {
        setIsLoadingProject(false);
      }
    }

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

  const handleFileSelect = async (file: FileEntry) => {
    setSelectedFile(file);
    setSelectedFileContent('');
    setErrorFileContent(null);
    setIsEditing(false); // Reset editing mode when a new file is selected
    setCurrentFormData(null);
    setEditorSchema(null);
    setSaveError(null);

    if (file.type === 'directory') {
        setIsLoadingFileContent(false);
        return;
    }

    setIsLoadingFileContent(true);
    try {
      const content = await getFileContent(projectId, file.path);
      setSelectedFileContent(content);
      // Prepare for potential editing if it's a JSON schema
      if (file.specInfo?.type === 'json_schema' && file.specInfo.isValid) {
        try {
          let parsedSchemaData;
          if (file.extension === '.yaml' || file.extension === '.yml') {
            parsedSchemaData = yaml.load(content);
          } else { // Assuming .json
            parsedSchemaData = JSON.parse(content);
          }
          // For JSON Schema, the schema itself is the data we edit directly.
          setEditorSchema(parsedSchemaData as RJSFSchema);
          setCurrentFormData(parsedSchemaData as FormData); // Initialize form with schema content
        } catch (e) {
          console.error("Error parsing schema file for editor setup:", e);
          setErrorFileContent("Failed to parse schema file for editing. Viewing as raw text.");
          // Keep editorSchema and currentFormData null so editor doesn't show
        }
      }
    } catch (err) {
      setErrorFileContent(err instanceof Error ? err.message : 'Failed to load file content.');
    } finally {
      setIsLoadingFileContent(false);
    }
  };

  const handleEditClick = () => {
    if (!selectedFile || !selectedFileContent) return;
    // Schema and initial form data should have been prepared in handleFileSelect for JSON Schemas
    if (selectedFile.specInfo?.type === 'json_schema' && selectedFile.specInfo.isValid && editorSchema && currentFormData !== null) {
        setIsEditing(true);
        setSaveError(null);
    } else {
        alert("This file type is not currently editable with the form editor or was not parsed correctly for editing.");
    }
  };

  const handleEditorChange = (data: IChangeEvent<FormData>) => { // Corrected type for RJSF v5+
    setCurrentFormData(data.formData); // Update form data as user types
  };

  const handleSave = async () => {
    if (!selectedFile || currentFormData === null) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      // The backend expects the content to be an object if it's JSON/YAML,
      // it will stringify/dump it based on the file extension.
      await updateFileContent(projectId, selectedFile.path, currentFormData);
      // Update the view content with the saved data
      let newContentString;
      if (selectedFile.extension === '.yaml' || selectedFile.extension === '.yml') {
        newContentString = yaml.dump(currentFormData);
      } else { // Assuming JSON
        newContentString = JSON.stringify(currentFormData, null, 2);
      }
      setSelectedFileContent(newContentString);
      setIsEditing(false);
      // Optionally, re-fetch file list or update specific file's specInfo if save could alter it
      // For now, we just update the displayed content. A full refresh of specInfo might be good.
      // Consider updating selectedFile.specInfo or even re-fetching files.
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save file.");
      console.error("Error saving file:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError(null);
    // Reset form data to original by re-parsing selectedFileContent
    if (selectedFile && selectedFileContent && selectedFile.specInfo?.type === 'json_schema' && selectedFile.specInfo.isValid) {
        try {
            let parsedData = (selectedFile.extension === '.yaml' || selectedFile.extension === '.yml')
                ? yaml.load(selectedFileContent)
                : JSON.parse(selectedFileContent);
            setCurrentFormData(parsedData as FormData);
            // editorSchema should still be the same as it was set on file select
        } catch (e) {
            console.error("Error re-parsing schema on cancel:", e);
        }
    }
  };

  const renderFileContentOrEditor = () => {
    if (!selectedFile || selectedFile.type === 'directory') return null;

    // Editing mode for JSON Schema
    if (isEditing && selectedFile.specInfo?.type === 'json_schema' && selectedFile.specInfo.isValid && editorSchema && currentFormData !== null) {
      return (
        <>
          <JsonSchemaEditor
            schema={editorSchema as RJSFSchema}
            formData={currentFormData}
            onChange={handleEditorChange}
            liveValidate={false}
            showErrorList={true}
            // onError={(errors) => console.log("RJSF Errors:", errors)} // Optional error logging
            // ref={rjsfFormRef} // If programmatic submit needed
          />
          {saveError && <p className="mt-2 text-sm text-red-500 bg-red-100 p-2 rounded">Save Error: {saveError}</p>}
          <div className="mt-4 flex space-x-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSaving ? 'Saving...' : 'Save Schema'}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </>
      );
    }

    // View mode
    const content = selectedFileContent;
    if (content === '' && selectedFile.size === 0) return <p className="p-3 text-gray-500 italic">File is empty.</p>;
    if (content === null || content === undefined) return <p className="p-3 text-gray-500 italic">No content loaded.</p>;

    let contentDisplay;
    let note = null;
    const specType = selectedFile.specInfo?.type;

    if (selectedFile.specInfo?.isValid) {
      if (specType === 'json' || (specType === 'json_schema' && selectedFile.extension === '.json')) {
        try {
          contentDisplay = <pre className="p-3 whitespace-pre-wrap break-all overflow-auto max-h-[60vh] text-xs bg-white rounded-b">{JSON.stringify(JSON.parse(content), null, 2)}</pre>;
        } catch (e) {
            contentDisplay = <>
                <p className='text-xs text-orange-600 p-2 bg-orange-100'>Frontend JSON parsing failed. Displaying raw content:</p>
                <pre className="p-3 whitespace-pre-wrap break-all overflow-auto max-h-[60vh] text-xs bg-white rounded-b">{content}</pre>
            </>;
        }
      } else if (specType === 'yaml' || specType === 'yml' || (specType === 'json_schema' && (selectedFile.extension === '.yaml' || selectedFile.extension === '.yml'))) {
        contentDisplay = <pre className="p-3 whitespace-pre-wrap break-all overflow-auto max-h-[60vh] text-xs bg-white rounded-b">{content}</pre>;
      } else if (specType === 'openapi' || specType === 'asyncapi') {
        let isUnderlyingJSON = false;
        try { JSON.parse(content); isUnderlyingJSON = true; } catch(e) {} // Simple check
        if (isUnderlyingJSON) {
            contentDisplay = <pre className="p-3 whitespace-pre-wrap break-all overflow-auto max-h-[60vh] text-xs bg-white rounded-b">{JSON.stringify(JSON.parse(content), null, 2)}</pre>;
        } else {
            contentDisplay = <pre className="p-3 whitespace-pre-wrap break-all overflow-auto max-h-[60vh] text-xs bg-white rounded-b">{content}</pre>;
        }
        note = <p className="mt-2 text-xs text-gray-500 italic p-2 bg-yellow-50 rounded-b">Raw {specType?.toUpperCase()} content displayed. Advanced viewer/editor coming soon.</p>;
      } else {
        contentDisplay = <pre className="p-3 whitespace-pre-wrap break-all overflow-auto max-h-[60vh] text-xs bg-white rounded-b">{content}</pre>;
      }
    } else { // Fallback for files that backend couldn't validate/parse as a specific known type (e.g. malformed, or just 'other')
      contentDisplay = <pre className="p-3 whitespace-pre-wrap break-all overflow-auto max-h-[60vh] text-xs bg-white rounded-b">{content}</pre>;
    }

    // Show Edit button only for JSON Schemas in view mode
    const canEdit = selectedFile.specInfo?.type === 'json_schema' && selectedFile.specInfo.isValid;

    return (
      <>
        {contentDisplay}
        {note}
        {canEdit && !isEditing && (
          <div className="mt-4">
            <button
              onClick={handleEditClick}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Edit Schema
            </button>
          </div>
        )}
      </>
    );
  };

  // Main return for ProjectDetailPage
  if (isLoadingProject) return <div className="p-8 text-center">Loading project details...</div>;
  if (errorProject) return <div className="p-8 text-center text-red-500">Error: {errorProject}</div>;
  if (!project) return <div className="p-8 text-center">Project not found.</div>;

  return (
    <div className="container mx-auto p-4 md:p-8">
      {/* Project Info Header */}
      <div className="mb-6 pb-4 border-b border-gray-300">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{project.name}</h1>
        <p className="text-gray-600">{project.description || 'No description.'}</p>
        <p className="text-sm text-gray-500 mt-1">Type: {project.isGitCloned ? \`Git Cloned (\${project.gitUrl})\` : 'Local Project'}</p>
        <Link href="/" className="text-blue-600 hover:underline text-sm mt-2 inline-block">&larr; Back to All Projects</Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* File Browser Panel */}
        <div className="md:col-span-1 bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">File Browser</h2>
          {isLoadingFiles && <p>Loading files...</p>}
          {errorFiles && <p className="text-red-500">Error: {errorFiles}</p>}
          {!isLoadingFiles && !errorFiles && files.length === 0 && <p>No files or directories.</p>}
          {!isLoadingFiles && !errorFiles && files.length > 0 && (
            <div>{files.map(node => <FileTreeNode key={node.path} node={node} onFileSelect={handleFileSelect} />)}</div>
          )}
        </div>

        {/* File Viewer/Editor Panel */}
        <div className="md:col-span-2 bg-white p-4 rounded-lg shadow min-h-[400px]">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">
            {selectedFile && selectedFile.type === 'file' ? \`Content: \${selectedFile.name}\` : 'Select a file to view its content'}
          </h2>

          {selectedFile && selectedFile.type === 'file' && (
            <div className="mt-2 p-1 border-top border-gray-200 text-sm"> {/* Removed bg-gray-50 for editor to have white bg */}
              {/* Metadata Display */}
              <div className='p-3 border-b border-gray-200 bg-slate-100 rounded-t mb-2'>
                <p><strong>Path:</strong> {selectedFile.path}</p>
                <p><strong>Type (Detected):</strong> {selectedFile.specInfo?.type || selectedFile.extension || 'N/A'}</p>
                <p><strong>Size:</strong> {selectedFile.size !== undefined ? (selectedFile.size / 1024).toFixed(2) + ' KB' : 'N/A'}</p>
                {selectedFile.specInfo && (
                  <>
                    <p><strong>Valid Parse (backend):</strong> {String(selectedFile.specInfo.isValid)}</p>
                    <p><strong>Is Known Spec:</strong> {String(selectedFile.specInfo.isSpec)}</p>
                    {selectedFile.specInfo.version && <p><strong>Version:</strong> {selectedFile.specInfo.version}</p>}
                  </>
                )}
              </div>

              {isLoadingFileContent && <p className="p-4 text-center text-gray-500">Loading content...</p>}
              {errorFileContent && <p className="p-4 text-red-500 text-center">Error: {errorFileContent}</p>}

              {!isLoadingFileContent && !errorFileContent && renderFileContentOrEditor()}
            </div>
          )}
          {(!selectedFile || selectedFile.type === 'directory') && (
            <p className="text-gray-500 text-center mt-10">
              {selectedFile && selectedFile.type === 'directory' ? \`Selected directory: \${selectedFile.name}\` : 'Select a file from the browser to view its content.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
