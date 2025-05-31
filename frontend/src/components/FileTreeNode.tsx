"use client";

import { FileEntry } from '@/types/project';
import { useState } from 'react';
// Placeholder for icons (e.g., from react-icons)
// import { FaFolder, FaFolderOpen, FaFileAlt, FaFileCode, FaFileImage } from 'react-icons/fa';

interface FileTreeNodeProps {
  node: FileEntry;
  onFileSelect: (file: FileEntry) => void; // Callback when a file is selected
}

// Basic icon determination based on type and extension
const getIcon = (node: FileEntry, isOpen?: boolean) => {
  if (node.type === 'directory') {
    return isOpen ? '[D+]' : '[D-]'; // Simple text icons
    // return isOpen ? <FaFolderOpen /> : <FaFolder />;
  }
  // Basic file type icons based on specInfo or extension
  if (node.specInfo?.isSpec) {
    if (node.specInfo.type === 'openapi') return '[OAPI]';
    if (node.specInfo.type === 'asyncapi') return '[AAPI]';
    if (node.specInfo.type === 'json_schema') return '[JSONS]';
  }
  if (node.extension === '.json') return '[JSON]';
  if (node.extension === '.yaml' || node.extension === '.yml') return '[YAML]';
  return '[File]';
  // return <FaFileAlt />;
};

export default function FileTreeNode({ node, onFileSelect }: FileTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    if (node.type === 'directory') {
      setIsOpen(!isOpen);
    }
  };

  const handleFileClick = () => {
    if (node.type === 'file') {
      onFileSelect(node);
    } else {
      // Optionally toggle directory on name click as well
      handleToggle();
    }
  };

  return (
    <div className="ml-4 my-1">
      <div
        onClick={node.type === 'directory' ? handleToggle : handleFileClick}
        className={\`flex items-center cursor-pointer p-1 rounded hover:bg-gray-200 \${node.type === 'file' ? 'text-blue-600 hover:underline' : 'text-gray-700'}\`}
        title={node.path}
      >
        <span className="mr-2 w-6 text-center">{getIcon(node, isOpen)}</span>
        <span>{node.name}</span>
        {node.type === 'directory' && node.children && node.children.length === 0 && (
          <span className="ml-2 text-xs text-gray-400">(empty)</span>
        )}
      </div>
      {node.type === 'directory' && isOpen && node.children && node.children.length > 0 && (
        <div className="ml-4 border-l border-gray-300 pl-2">
          {node.children.map((childNode) => (
            <FileTreeNode key={childNode.path} node={childNode} onFileSelect={onFileSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
