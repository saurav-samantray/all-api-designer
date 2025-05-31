"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Project, FileEntry, RJSFSchema } from '@/types/project';
import { getProjectById, getProjectFiles, getFileContent, updateFileContent } from '@/services/projectService';
import FileTreeNode from '@/components/FileTreeNode';
import JsonSchemaEditor from '@/components/editors/JsonSchemaEditor';
import OpenApiEditor from '@/components/editors/OpenApiEditor';
import AsyncApiEditor from '@/components/editors/AsyncApiEditor';
import Spinner from '@/components/ui/Spinner';
import AlertMessage from '@/components/ui/AlertMessage';
import JsonPrettyPrintRecursive from '@/components/ui/JsonPrettyPrintRecursive'; // Import new component
import Link from 'next/link';
import * as yaml from 'js-yaml';
import { IChangeEvent, GenericObjectType } from '@rjsf/utils';


const buttonBaseClass = "px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex items-center justify-center";
const primaryButtonClass = `\${buttonBaseClass} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed`;
const secondaryButtonClass = `\${buttonBaseClass} bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed`;
const successButtonClass = `\${buttonBaseClass} bg-green-600 text-white hover:bg-green-700 focus:ring-green-500`;

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
  const [selectedFileContent, setSelectedFileContent] = useState<string>('');
  const [isLoadingFileContent, setIsLoadingFileContent] = useState<boolean>(false);
  const [errorFileContent, setErrorFileContent] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentFormData, setCurrentFormData] = useState<Record<string, any> | null>(null);
  const [editorSchema, setEditorSchema] = useState<RJSFSchema | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [formContext, setFormContext] = useState<GenericObjectType>({});

  useEffect(() => {
    if (!projectId) return;
    setIsEditing(false); setCurrentFormData(null); setEditorSchema(null); setSelectedFile(null); setSaveSuccess(false); setSelectedFileContent('');
    async function fetchProjectDetails() { setIsLoadingProject(true); setErrorProject(null); try { const cp = await getProjectById(projectId); setProject(cp); if (!cp && !errorProject) setErrorProject('Project not found.'); } catch (e) { setErrorProject(e instanceof Error ? e.message : 'Err load project.'); setProject(null); } finally { setIsLoadingProject(false); } }
    async function fetchProjectFiles() { setIsLoadingFiles(true); setErrorFiles(null); try { const pf = await getProjectFiles(projectId); setFiles(pf); } catch (e) { setErrorFiles(e instanceof Error ? e.message : 'Err load files.'); } finally { setIsLoadingFiles(false); } }
    fetchProjectDetails(); fetchProjectFiles();
  }, [projectId]);

  useEffect(() => {
    setFormContext({ projectId: projectId, currentFilePath: selectedFile?.path || null });
  }, [projectId, selectedFile]);

  const handleFileSelect = async (file: FileEntry) => {
    setSelectedFile(file); setSelectedFileContent(''); setErrorFileContent(null); setIsEditing(false);
    setCurrentFormData(null); setEditorSchema(null); setSaveError(null); setSaveSuccess(false);
    if (file.type === 'directory') { setIsLoadingFileContent(false); return; }
    setIsLoadingFileContent(true);
    try {
      const content = await getFileContent(projectId, file.path); setSelectedFileContent(content);
      const specType = file.specInfo?.type; const isValid = file.specInfo?.isValid;
      if (isValid && content) {
        let parsedData: any;
        try {
          parsedData = (file.extension === '.yaml' || file.extension === '.yml') ? yaml.load(content) : JSON.parse(content);
          if (specType === 'json_schema') { setEditorSchema(parsedData as RJSFSchema); setCurrentFormData(parsedData); }
          else if (specType === 'openapi' || specType === 'asyncapi') { setCurrentFormData(parsedData); setEditorSchema(null); }
        } catch (e) { setErrorFileContent(\`File identified as '\${specType}' but failed to parse: \${(e as Error).message}. Viewing as raw text.\`); }
      } else if (!isValid && content && specType !== 'other' && specType !== 'json' && specType !== 'yaml') {
          setErrorFileContent(\`File identified as '\${specType}', but backend parsing/validation failed. Viewing as raw text.\`);
      } else if (!content && file.size !== 0 ) {
          setErrorFileContent('File content could not be loaded or is empty when not expected.');
      }
    } catch (err) { setErrorFileContent(err instanceof Error ? err.message : 'Failed to load file content.'); }
    finally { setIsLoadingFileContent(false); }
  };
  const handleEditClick = () => {
    if (!selectedFile || !selectedFileContent || !selectedFile.specInfo?.isValid) { alert("Cannot edit: file may be invalid or not supported."); return; }
    const specType = selectedFile.specInfo.type;
    if (currentFormData !== null && (specType === 'json_schema' || specType === 'openapi' || specType === 'asyncapi')) {
        setIsEditing(true); setSaveError(null); setSaveSuccess(false);
    } else { alert(\`Editor for \${specType} could not initialize. Content might be malformed or not parsed correctly.\`);}
  };
  const handleEditorDataChange = (data: Record<string, any> | IChangeEvent<Record<string, any>>) => {
    setCurrentFormData((data as IChangeEvent<Record<string, any>>)?.formData !== undefined ? (data as IChangeEvent<Record<string, any>>).formData : data as Record<string, any>);
    setSaveSuccess(false);
  };
  const handleSave = async () => {
    if (!selectedFile || currentFormData === null) return;
    setIsSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      await updateFileContent(projectId, selectedFile.path, currentFormData);
      let newContentString = (selectedFile.extension === '.yaml' || selectedFile.extension === '.yml') ? yaml.dump(currentFormData) : JSON.stringify(currentFormData, null, 2);
      setSelectedFileContent(newContentString); setIsEditing(false); setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) { setSaveError(err instanceof Error ? err.message : "Failed to save file.");}
    finally { setIsSaving(false); }
  };
  const handleCancelEdit = () => {
    setIsEditing(false); setSaveError(null); setSaveSuccess(false);
    if (selectedFile && selectedFileContent && selectedFile.specInfo?.isValid) {
        try {
            let parsedData = (selectedFile.extension === '.yaml' || selectedFile.extension === '.yml') ? yaml.load(selectedFileContent) : JSON.parse(selectedFileContent);
            setCurrentFormData(parsedData);
            if (selectedFile.specInfo.type === 'json_schema') setEditorSchema(parsedData as RJSFSchema);
        } catch (e) { console.error("Error re-parsing on cancel:", e); }
    }
  };

  const renderFileContentOrEditor = () => {
    if (!selectedFile || selectedFile.type === 'directory') return null;
    const specType = selectedFile.specInfo?.type;
    const canEditThisType = (specType === 'json_schema' || specType === 'openapi' || specType === 'asyncapi');

    if (isEditing && canEditThisType && selectedFile.specInfo?.isValid && currentFormData !== null) {
      let editorElement = null;
      if (specType === 'json_schema' && editorSchema) editorElement = <JsonSchemaEditor schema={editorSchema} formData={currentFormData} onChange={handleEditorDataChange} formContext={formContext} fields={{}} />;
      else if (specType === 'openapi') editorElement = <OpenApiEditor specData={currentFormData} onChange={handleEditorDataChange} formContext={formContext} />;
      else if (specType === 'asyncapi') editorElement = <AsyncApiEditor specData={currentFormData} onChange={handleEditorDataChange} formContext={formContext} />;
      if (editorElement) {
        return ( <div className="space-y-4"> {editorElement} {saveError && <AlertMessage type="error" title="Save Error" message={saveError} className="mt-2"/>} <div className="flex items-center space-x-3 pt-3 border-t mt-4"> <button onClick={handleSave} disabled={isSaving} className={primaryButtonClass}> {isSaving ? <><Spinner size={16} className="mr-2"/> Saving...</> : 'Save Changes'} </button> <button onClick={handleCancelEdit} disabled={isSaving} className={secondaryButtonClass}>Cancel</button> </div> </div>);
      }
    }

    if (isLoadingFileContent) return <div className="flex justify-center items-center h-40"><Spinner size={32} /></div>;
    if (errorFileContent && !isEditing) return <AlertMessage type="error" title="File Content Error" message={errorFileContent} />;

    const content = selectedFileContent;
    if (content === '' && selectedFile.size === 0 && !isLoadingFileContent) return <AlertMessage type="info" message="File is empty." />;
    if ((content === null || content === undefined) && !isLoadingFileContent) return <AlertMessage type="warning" message="No content loaded or file could not be read." />;

    let contentDisplay; let note = null;
    const isJsonUnderlying = selectedFile.extension === '.json' ||
                             (selectedFile.specInfo?.type === 'openapi' && selectedFile.extension === '.json') ||
                             (selectedFile.specInfo?.type === 'asyncapi' && selectedFile.extension === '.json') ||
                             (selectedFile.specInfo?.type === 'json_schema' && selectedFile.extension === '.json');

    if (selectedFile.specInfo?.isValid && isJsonUnderlying) {
      try {
        const parsedJson = JSON.parse(content);
        contentDisplay = (
          <div className="p-3 bg-white rounded-b-md border max-h-[60vh] overflow-auto text-xs">
            <JsonPrettyPrintRecursive data={parsedJson} projectId={projectId} currentFilePath={selectedFile.path} />
          </div>
        );
      } catch (e) {
        contentDisplay = <><AlertMessage type="warning" title="Frontend JSON Parsing Failed" message="Displaying raw content." className="mb-0 rounded-b-none border-b-0" /><pre className="p-3 whitespace-pre-wrap break-all overflow-auto max-h-[60vh] text-xs bg-white rounded-b-md border border-t-0">{content}</pre></>;
      }
    } else if (selectedFile.specInfo?.isValid && (selectedFile.extension === '.yaml' || selectedFile.extension === '.yml')) {
      contentDisplay = <pre className="p-3 whitespace-pre-wrap break-all overflow-auto max-h-[60vh] text-xs bg-white rounded-b-md border">{content}</pre>;
    } else {
      contentDisplay = <pre className="p-3 whitespace-pre-wrap break-all overflow-auto max-h-[60vh] text-xs bg-white rounded-b-md border">{content}</pre>;
    }

    if (specType === 'openapi' || specType === 'asyncapi') {
       note = <AlertMessage type="info" message={`Raw ${specType?.toUpperCase()} content. Advanced editor for full spec coming soon.`} className="mt-1 text-xs rounded-md"/>;
    } else if (specType && specType !== 'other' && (specType.endsWith('_malformed') || specType.endsWith('_error'))) {
       note = <AlertMessage type="warning" title="File Format Issue" message={`This file was identified as ${specType.replace('_malformed','').replace('_error','')} but has parsing issues according to the backend.`} className="mt-1 text-xs rounded-md"/>;
    }

    const showEditButton = canEditThisType && selectedFile.specInfo?.isValid && !isEditing && currentFormData !== null;
    let editText = "Edit";
    if (specType === 'json_schema') editText = "Edit Schema"; else if (specType === 'openapi' || specType === 'asyncapi') editText = "Edit Spec Info";

    return ( <div className="space-y-2"> {contentDisplay} {note} {showEditButton && (<div className="mt-4 pt-3 border-t"><button onClick={handleEditClick} className={successButtonClass}>{editText}</button></div>)} </div> );
  };

  if (isLoadingProject) return <div className="flex justify-center items-center min-h-screen"><Spinner size={48} /></div>;
  if (errorProject && !project) return <div className="p-6"><AlertMessage type="error" title="Project Load Error" message={errorProject} /></div>;
  if (!project) return <div className="p-6 text-center"><AlertMessage type="info" message="Project not found." /></div>;

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 pb-4 border-b">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">{project.name}</h1>
        <p className="text-gray-600 text-sm mb-2">{project.description || 'No description.'}</p>
        <p className="text-xs text-gray-500">Type: {project.isGitCloned ? \`Git (\${project.gitUrl})\` : 'Local'}</p>
        <Link href="/" className="text-blue-600 hover:underline text-sm mt-2 inline-block">&larr; Back to Projects</Link>
      </div>
      {errorProject && project && <AlertMessage type="error" title="Project Data Issue" message={errorProject} className="mb-4"/>}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">File Browser</h2>
          {isLoadingFiles && <div className="flex justify-center py-4"><Spinner /></div>}
          {errorFiles && <AlertMessage type="error" title="File List Error" message={errorFiles} />}
          {!isLoadingFiles && !errorFiles && files.length === 0 && <AlertMessage type="info" message="No files or directories." />}
          {!isLoadingFiles && !errorFiles && files.length > 0 && (
            <div className="max-h-[70vh] overflow-y-auto">{files.map(node => <FileTreeNode key={node.path} node={node} onFileSelect={handleFileSelect} />)}</div>
          )}
        </div>
        <div className="lg:col-span-8 bg-white p-4 rounded-lg shadow-md min-h-[400px]">
          <h2 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">
            {selectedFile && selectedFile.type === 'file' ? \`Content: \${selectedFile.name}\` : 'File Content'}
          </h2>
          {saveSuccess && <AlertMessage type="success" title="Success" message="File saved successfully!" className="mb-3" />}
          {selectedFile && selectedFile.type === 'file' && (
            <div className="mt-2 text-sm">
              <div className='p-3 border rounded-t-md bg-slate-50 mb-2 text-xs'>
                <p><strong>Path:</strong> {selectedFile.path}</p>
                <p><strong>Type (Detected):</strong> {selectedFile.specInfo?.type || selectedFile.extension || 'N/A'}</p>
                <p><strong>Size:</strong> {selectedFile.size !== undefined ? (selectedFile.size / 1024).toFixed(2) + ' KB' : 'N/A'}</p>
                {selectedFile.specInfo && (<>
                    <p><strong>Valid (Backend):</strong> {String(selectedFile.specInfo.isValid)}</p>
                    <p><strong>Is Known Spec:</strong> {String(selectedFile.specInfo.isSpec)}</p>
                    {selectedFile.specInfo.version && <p><strong>Version:</strong> {selectedFile.specInfo.version}</p>}
                </>)}
              </div>
              {!isLoadingFileContent && renderFileContentOrEditor()}
              {isLoadingFileContent && <div className="flex justify-center items-center h-40"><Spinner size={32} /></div>}
              {errorFileContent && !isEditing && <AlertMessage type="error" title="Error Loading File" message={errorFileContent} className="mb-3"/>}
            </div>
          )}
          {(!selectedFile || selectedFile.type === 'directory') && (
            <div className="flex items-center justify-center h-full text-gray-500">
                <p className="text-center">
                {selectedFile && selectedFile.type === 'directory' ? \`Selected directory: \${selectedFile.name}\` : 'Select a file to view or edit its content.'}
                </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
