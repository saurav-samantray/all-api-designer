"use client";

import InteractiveRefValue from './InteractiveRefValue';

interface JsonPrettyPrintRecursiveProps {
  data: any;
  projectId: string;
  currentFilePath: string;
  indent?: number;
  isRefKey?: boolean;
}

const looksLikeRef = (value: string): boolean => {
    if (typeof value !== 'string') return false;
    return value.startsWith('#/') || value.includes('.json') || value.includes('.yaml') || value.includes('.yml');
};

export default function JsonPrettyPrintRecursive({
  data,
  projectId,
  currentFilePath,
  indent = 0,
  isRefKey = false
}: JsonPrettyPrintRecursiveProps) {
  const PADDING_PER_LEVEL = 2;

  if (typeof data === 'string') {
    if (isRefKey || looksLikeRef(data)) {
      return <InteractiveRefValue value={data} projectId={projectId} currentFilePath={currentFilePath} />;
    }
    return <span className="text-green-700">"{data}"</span>;
  }
  if (typeof data === 'number') {
    return <span className="text-purple-700">{data}</span>;
  }
  if (typeof data === 'boolean') {
    return <span className="text-red-700">{String(data)}</span>;
  }
  if (data === null) {
    return <span className="text-gray-500">null</span>;
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-gray-800">[]</span>;
    return (
      <span className="text-gray-800">
        [<br />
        {data.map((item, index) => (
          <span key={index} style={{ paddingLeft: `${(indent + 1) * PADDING_PER_LEVEL}ch` }}>
            <JsonPrettyPrintRecursive
                data={item}
                projectId={projectId}
                currentFilePath={currentFilePath}
                indent={indent + 1} />
            {index < data.length - 1 ? ',' : ''}
            <br />
          </span>
        ))}
        <span style={{ paddingLeft: `${indent * PADDING_PER_LEVEL}ch` }}>]</span>
      </span>
    );
  }
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span className="text-gray-800">{"{}"}</span>;
    return (
      <span className="text-gray-800">
        {"{"}<br />
        {keys.map((key, index) => (
          <span key={key} style={{ paddingLeft: `${(indent + 1) * PADDING_PER_LEVEL}ch` }}>
            <span className="text-sky-700">"{key}"</span>: {/* Key color */}
            <JsonPrettyPrintRecursive
                data={data[key]}
                projectId={projectId}
                currentFilePath={currentFilePath}
                indent={indent + 1}
                isRefKey={key === '$ref'}
                />
            {index < keys.length - 1 ? ',' : ''}
            <br />
          </span>
        ))}
        <span style={{ paddingLeft: `${indent * PADDING_PER_LEVEL}ch` }}>{"}"}</span>
      </span>
    );
  }
  return <span>{String(data)}</span>;
}
