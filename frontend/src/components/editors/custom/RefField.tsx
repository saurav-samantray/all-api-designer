"use client";

import { useState, useEffect, useCallback } from 'react';
import { FieldProps } from '@rjsf/utils';
import { resolveProjectReference, getProjectFiles, getFileContent } from '@/services/projectService';
import { FileEntry } from '@/types/project';
import Spinner from '@/components/ui/Spinner';
import AlertMessage from '@/components/ui/AlertMessage';
import path from 'path-browserify';
import * as yaml from 'js-yaml';

// Basic Input component
const Input = (props: any) => (
  <input {...props} className={`block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${props.className || ''}`} />
);
// Basic Button component
const Button = (props: any) => (
  <button {...props} className={`px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 ${props.className || ''}`}>{props.children}</button>
);
// Modal component
const Modal = ({ isOpen, onClose, title, children, size = "max-w-xl" }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, size?: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white p-6 rounded-lg shadow-xl w-full ${size}`}>
        <div className="flex justify-between items-center mb-4"> <h3 className="text-lg font-semibold">{title}</h3> <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button> </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

// Debounce utility
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => { if (timeout) clearTimeout(timeout); timeout = setTimeout(() => resolve(func(...args)), waitFor); });
}

// calculateRelativePath function
function calculateRelativePath(fromPath: string, toPath: string): string {
  if (!fromPath || !toPath) return toPath;
  const normalize = (p: string) => p.startsWith('./') ? p.substring(2) : p;
  fromPath = normalize(fromPath); toPath = normalize(toPath);
  const fromDir = path.dirname(fromPath);
  let relative = path.relative(fromDir, toPath);
  if (!relative.startsWith('../') && !relative.startsWith('/') && !relative.startsWith('./')) { // Added !relative.startsWith('./')
    if (fromDir === '.' || path.dirname(relative) === '.') {
        relative = './' + relative;
    }
  }
  return relative.replace(/\\/g, '/');
}

// getInternalPaths function
const getInternalPaths = (parsedContent: any, currentPath = '#'): string[] => {
    if (!parsedContent || typeof parsedContent !== 'object') return [];
    let paths: string[] = [];
    // Adjusted commonSpecPaths to be more generic for typical object structures
    const commonStructureKeywords = ['components', 'definitions', '$defs', 'schemas', 'responses', 'parameters', 'requestBodies', 'messages', 'channels', 'paths', 'info'];

    for (const key of Object.keys(parsedContent)) {
        const newPath = currentPath === '#' ? \`#/\${key}\` : \`\${currentPath}/\${key}\`;
        // Check if the key is a common structure keyword or if the value is an object (to list its children)
        if (commonStructureKeywords.includes(key) || (currentPath === '#' && typeof parsedContent[key] === 'object')) {
            paths.push(newPath);
            if (typeof parsedContent[key] === 'object' && parsedContent[key] !== null) {
                Object.keys(parsedContent[key]).forEach(subKey => {
                    paths.push(\`\${newPath}/\${subKey}\`);
                });
            }
        } else if (currentPath !== '#' && typeof parsedContent[key] === 'object' && parsedContent[key] !== null) {
            // For nested objects not under common keywords, list their children if parent was already added
             Object.keys(parsedContent[key]).forEach(subKey => { paths.push(\`\${newPath}/\${subKey}\`); });
        } else if (currentPath === '#') { // Add all top-level keys if they haven't been added
            if (!paths.includes(newPath)) paths.push(newPath);
        }
    }
    // Ensure "#" (root) is always an option if there are any paths generated or if content itself is an object
    if (typeof parsedContent === 'object' && !paths.includes("#")) {
        paths.unshift("#");
    }
    return [...new Set(paths)].sort(); // Ensure uniqueness and sort
};

const ResolvedDataPreview = ({ data }: { data: any }) => {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') { return <p className="font-mono">{String(data)}</p>; }
  const title = data.title || data.name; const type = data.type; const description = data.description; const keys = Object.keys(data);
  return ( <div className="space-y-1"> {title && <p><span className="font-semibold">Title:</span> {String(title)}</p>} {type && <p><span className="font-semibold">Type:</span> {String(type)}</p>} {description && <p className="truncate"><span className="font-semibold">Desc:</span> {String(description)}</p>} {!title && !type && keys.length > 0 && ( <p><span className="font-semibold">Keys:</span> {keys.slice(0, 5).join(', ')}{keys.length > 5 ? '...' : ''} ({keys.length} total)</p> )} <details className="mt-1"> <summary className="text-xs cursor-pointer text-blue-600 hover:underline">View raw JSON</summary> <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all bg-slate-100 p-2 rounded">{JSON.stringify(data, null, 2)}</pre> </details> </div> );
};


const RefField = ({ schema, name, formData, onChange, registry, uiSchema, idSchema }: FieldProps<string>) => {
  const { formContext } = registry;
  const { projectId, currentFilePath: CtxCurrentFilePath } = formContext as { projectId?: string; currentFilePath?: string };

  const [inputValue, setInputValue] = useState(formData || '');
  const [resolvedData, setResolvedData] = useState<any>(null);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [isLoadingResolution, setIsLoadingResolution] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectFiles, setProjectFiles] = useState<FileEntry[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedFileForInternalPicking, setSelectedFileForInternalPicking] = useState<FileEntry | null>(null);
  const [isLoadingInternalContent, setIsLoadingInternalContent] = useState(false);
  const [internalPaths, setInternalPaths] = useState<string[]>([]);

  const debouncedResolveRef = useCallback(
    debounce(async (refToResolve: string) => {
      if (!projectId || !CtxCurrentFilePath || !refToResolve.trim()) { setResolvedData(null); setResolutionError(null); return; }
      setIsLoadingResolution(true); setResolutionError(null);
      try { const data = await resolveProjectReference(projectId, CtxCurrentFilePath, refToResolve); setResolvedData(data); }
      catch (error) { setResolvedData(null); setResolutionError(error instanceof Error ? error.message : 'Failed to resolve ref.'); }
      finally { setIsLoadingResolution(false); }
    }, 750), [projectId, CtxCurrentFilePath]
  );

  useEffect(() => {
    setInputValue(formData || '');
    if (formData && typeof formData === 'string' && formData.trim() !== '') debouncedResolveRef(formData);
    else { setResolvedData(null); setResolutionError(null); }
  }, [formData, debouncedResolveRef]);

  const handleInputChange = (value: string) => { setInputValue(value); onChange(value); };

  const openFilePickerModal = async () => {
    if (!projectId) { alert("Project context missing."); return; }
    setIsLoadingFiles(true); setIsModalOpen(true); setSearchTerm(''); setModalError(null);
    setSelectedFileForInternalPicking(null); setInternalPaths([]);
    try {
        const files = await getProjectFiles(projectId);
        setProjectFiles(files.filter(f => f.type === 'file' && (f.extension === '.json' || f.extension === '.yml' || f.extension === '.yaml' || f.specInfo?.isSpec)));
    } catch (error) {
        console.error("Failed to fetch project files:", error);
        setProjectFiles([]);
        setModalError(error instanceof Error ? error.message : "Could not load project files.");
    }
    finally { setIsLoadingFiles(false); }
  };

  const handleFileSelectedForInternalPicking = async (file: FileEntry) => {
    setSelectedFileForInternalPicking(file);
    setIsLoadingInternalContent(true); setInternalPaths([]); setModalError(null);
    try {
        if (!projectId) throw new Error("Project ID missing");
        const contentStr = await getFileContent(projectId, file.path);
        if (contentStr.trim() === '') { // Handle empty files
            setInternalPaths(['#']); // Offer only root for empty files
            return;
        }
        let parsed;
        if (file.extension === '.yaml' || file.extension === '.yml') parsed = yaml.load(contentStr);
        else parsed = JSON.parse(contentStr);

        const iPaths = getInternalPaths(parsed);
        setInternalPaths(iPaths.length > 0 ? iPaths : ['#']); // Ensure '#' is an option if no other paths found
    } catch (error) {
        console.error("Error loading/parsing file for internal picker:", error);
        setModalError(error instanceof Error ? \`Failed to parse \${file.name}: \${error.message}\` : "Failed to parse selected file.");
        setInternalPaths(['#']);
    }
    finally { setIsLoadingInternalContent(false); }
  };

  const handleInternalPathSelected = (internalPath: string) => {
    if (CtxCurrentFilePath && selectedFileForInternalPicking) {
      const relativeFilePath = calculateRelativePath(CtxCurrentFilePath, selectedFileForInternalPicking.path);
      const finalRef = internalPath === "#" || internalPath === "" ? relativeFilePath : \`\${relativeFilePath}\${internalPath}\`;
      handleInputChange(finalRef);
    }
    setIsModalOpen(false);
    setSelectedFileForInternalPicking(null);
  };

  const filteredFiles = projectFiles.filter(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()) || file.path.toLowerCase().includes(searchTerm.toLowerCase()));
  if (!projectId || !CtxCurrentFilePath) return <AlertMessage type="error" title="RefField Error" message="Missing 'projectId' or 'currentFilePath'." />;
  const title = uiSchema?.['ui:title'] || schema.title || name;

  return (
    <div className="mb-4 field field-string">
      {title && <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={idSchema?.$id}>{title}</label>}
      {schema.description && <p className="text-xs text-gray-500 mb-1">{schema.description}</p>}
      <div className="flex items-center space-x-2">
        <Input id={idSchema?.$id} name={name} value={inputValue} placeholder={uiSchema?.['ui:placeholder'] || "e.g., #/internal or ../file.yaml"} required={Array.isArray(schema.required) && schema.required.includes(name)} disabled={registry.readonly} type="text" onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleInputChange(event.target.value)} />
        <Button type="button" onClick={openFilePickerModal} className="flex-shrink-0" disabled={registry.readonly}>Browse...</Button>
      </div>

      {isLoadingResolution && <div className="mt-2 flex items-center text-sm text-gray-500"><Spinner size={16} className="mr-2"/> Resolving...</div>}
      {resolutionError && <AlertMessage type="error" title="Reference Error" message={resolutionError} className="mt-2 text-xs" />}
      {resolvedData && !resolutionError && inputValue.trim() !== '' && ( <div className="mt-2 p-3 border border-green-300 bg-green-50 rounded-md text-xs"> <p className="font-semibold text-green-700 mb-1">Reference Preview:</p> <ResolvedDataPreview data={resolvedData} /> </div> )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {setIsModalOpen(false); setSelectedFileForInternalPicking(null); setModalError(null);}}
        title={selectedFileForInternalPicking ? \`Select component in: \${selectedFileForInternalPicking.name}\` : "Select Reference Target File"}
        size={selectedFileForInternalPicking ? "max-w-2xl" : "max-w-xl"}
      >
        {modalError && <AlertMessage type="error" message={modalError} className="mb-3 text-xs" />}
        {!selectedFileForInternalPicking ? (
          <>
            <Input type="text" placeholder="Search files..." value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} className="mb-3"/>
            {isLoadingFiles ? <div className="flex justify-center py-4"><Spinner /></div> : (
              !modalError && projectFiles.length === 0 ? <AlertMessage type="info" message="No suitable files found in the project for referencing."/> :
              (projectFiles.length > 0 && filteredFiles.length === 0 && !modalError) ? <p className="p-3 text-sm text-gray-500">No files match your search.</p> :
              <div className="max-h-[50vh] overflow-y-auto border rounded-md">
                <ul className="divide-y divide-gray-200">
                  {filteredFiles.map(file => ( <li key={file.path} className="p-2 hover:bg-gray-100 cursor-pointer text-sm" onClick={() => handleFileSelectedForInternalPicking(file)}> <span className="font-medium">{file.name}</span> <span className="block text-xs text-gray-500">{file.path}</span> </li> ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-2 flex space-x-2">
              <Button type="button" onClick={() => {setSelectedFileForInternalPicking(null); setModalError(null); setInternalPaths([]);}} className="text-xs">&larr; Back to files</Button>
              <Button type="button" onClick={() => handleInternalPathSelected("#")} className="text-xs bg-blue-50 hover:bg-blue-100">Use Entire File (\`\${selectedFileForInternalPicking.name}\`)</Button>
            </div>
            {isLoadingInternalContent ? <div className="flex justify-center py-4"><Spinner /></div> : (
              !modalError && internalPaths.length === 0 ? <AlertMessage type="info" message="No common internal components found or file is empty. You can select the whole file." /> :
              <div className="max-h-[45vh] overflow-y-auto border rounded-md">
                 <ul className="divide-y divide-gray-200">
                  {internalPaths.map(internalPath => ( <li key={internalPath} className="p-2 hover:bg-gray-100 cursor-pointer text-sm" onClick={() => handleInternalPathSelected(internalPath)}> {internalPath === "#" ? "(File Root)" : internalPath} </li>))}
                </ul>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default RefField;
