"use client";

import { FileEntry } from '@/types/project';
import { useState } from 'react';
import {
  Folder,
  FolderOpen,
  File,
  FileJson,
  FileCode, // Generic for code-like, can be for YAML too
  FileText, // Default for other files
  FileQuestion // For unknown or malformed
} from 'lucide-react';

interface FileTreeNodeProps {
  node: FileEntry;
  onFileSelect: (file: FileEntry) => void;
  // Add indent level for potentially better visual styling of nested items if needed later
  // indentLevel?: number;
}

const getIcon = (node: FileEntry, isOpen?: boolean) => {
  const iconSize = 16; // Consistent icon size
  const iconClassName = "inline-block mr-2 flex-shrink-0";

  if (node.type === 'directory') {
    return isOpen
      ? <FolderOpen size={iconSize} className={iconClassName} />
      : <Folder size={iconSize} className={iconClassName} />;
  }

  const specType = node.specInfo?.type;
  const isValid = node.specInfo?.isValid;

  if (!isValid && specType?.includes('_malformed')) {
    return <FileQuestion size={iconSize} className={\`\${iconClassName} text-red-500\`} title="Malformed file" />;
  }
  if (!isValid && specType?.includes('_error')) {
    return <FileQuestion size={iconSize} className={\`\${iconClassName} text-orange-500\`} title="Error processing file" />;
  }

  if (specType === 'openapi') return <FileCode size={iconSize} className={\`\${iconClassName} text-green-600\`} title="OpenAPI Spec" />;
  if (specType === 'asyncapi') return <FileCode size={iconSize} className={\`\${iconClassName} text-purple-600\`} title="AsyncAPI Spec" />;
  if (specType === 'json_schema') return <FileJson size={iconSize} className={\`\${iconClassName} text-blue-600\`} title="JSON Schema" />;

  // More specific based on extension if not a known spec type from specInfo.type
  if (node.extension === '.json') return <FileJson size={iconSize} className={iconClassName} title="JSON File" />;
  if (node.extension === '.yaml' || node.extension === '.yml') return <FileCode size={iconSize} className={iconClassName} title="YAML File" />; // FileCode can represent generic code/structured text
  if (node.extension === '.xml') return <FileCode size={iconSize} className={iconClassName} title="XML File" />;
  if (node.extension === '.md') return <FileText size={iconSize} className={iconClassName} title="Markdown File" />;
  if (node.extension === '.txt') return <FileText size={iconSize} className={iconClassName} title="Text File" />;

  return <File size={iconSize} className={iconClassName} title="File" />; // Default file icon
};

export default function FileTreeNode({ node, onFileSelect }: FileTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  // const currentIndent = indentLevel || 0;

  const handleToggle = () => {
    if (node.type === 'directory') {
      setIsOpen(!isOpen);
    }
  };

  const handleNodeClick = () => {
    if (node.type === 'file') {
      onFileSelect(node);
    } else { // Directory
      handleToggle();
    }
  };

  return (
    <div className="my-0.5"> {/* Reduced margin for tighter packing if desired */}
      <div
        onClick={handleNodeClick}
        className={\`flex items-center cursor-pointer p-1.5 rounded hover:bg-gray-100 \${node.type === 'file' ? 'text-gray-700 hover:text-blue-700' : 'text-gray-800'}\`}
        title={node.path}
        // style={{ paddingLeft: \`\${currentIndent * 16}px\` }} // Optional: if using indentLevel prop
      >
        {getIcon(node, isOpen)}
        <span className="truncate text-sm">{node.name}</span>
        {node.type === 'directory' && node.children && node.children.length === 0 && (
          <span className="ml-2 text-xs text-gray-400 italic">(empty)</span>
        )}
      </div>
      {node.type === 'directory' && isOpen && node.children && node.children.length > 0 && (
        <div className="ml-4 pl-2 border-l border-gray-300"> {/* Indentation for children */}
          {node.children.map((childNode) => (
            <FileTreeNode
              key={childNode.path}
              node={childNode}
              onFileSelect={onFileSelect}
              // indentLevel={currentIndent + 1} // Optional
            />
          ))}
        </div>
      )}
    </div>
  );
}
