"use client";

import { useState, useCallback } from 'react';
import { resolveProjectReference } from '@/services/projectService';
import Spinner from '@/components/ui/Spinner';
import { Link2, AlertCircle } from 'lucide-react'; // Using Link2 as an icon

interface InteractiveRefValueProps {
  value: string; // The $ref string
  projectId: string;
  currentFilePath: string;
}

const ResolvedDataDisplay = ({ data }: { data: any }) => {
  if (data === null || data === undefined) return <p className="text-xs text-gray-500">No data.</p>;
  if (typeof data !== 'object') return <p className="text-xs font-mono">{String(data)}</p>;
  const title = data.title || data.name;
  const type = data.type;
  return (
    <div className="text-xs">
      {title && <p><span className="font-semibold">Title:</span> {String(title)}</p>}
      {type && <p><span className="font-semibold">Type:</span> {String(type)}</p>}
      {!title && !type && <p className="font-mono">{JSON.stringify(data, null, 1).substring(0, 100)}...</p>}
    </div>
  );
};

export default function InteractiveRefValue({ value, projectId, currentFilePath }: InteractiveRefValueProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [resolvedData, setResolvedData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = useCallback(async () => {
    if (!value || !projectId || !currentFilePath) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await resolveProjectReference(projectId, currentFilePath, value);
      setResolvedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve reference.");
    } finally {
      setIsLoading(false);
    }
  }, [value, projectId, currentFilePath]);

  const onIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showPopover) {
        handleResolve();
    }
    setShowPopover(!showPopover);
  };

  const onMouseEnterIcon = () => {
    if (!resolvedData && !isLoading && !error && !showPopover) {
        handleResolve();
    }
  }

  return (
    <span className="relative inline-flex items-center group"> {/* Added group for potential group-hover states */}
      <span className="font-mono text-blue-600 hover:underline cursor-default" title={value}>{value}</span>
      <button
        onClick={onIconClick}
        onMouseEnter={onMouseEnterIcon}
        // onMouseLeave={() => setShowPopover(false)} // Alternative: close on mouse leave from button
        className="ml-1 text-blue-500 hover:text-blue-700 focus:outline-none opacity-50 group-hover:opacity-100 transition-opacity"
        aria-label="Resolve reference"
        title="Show details of this reference"
      >
        <Link2 size={14} />
      </button>

      {showPopover && (
        <div
            className="absolute z-20 top-full left-0 mt-1 w-72 p-3 bg-white border border-gray-300 rounded-md shadow-lg"
            // To keep popover open while mouse is inside it:
            onMouseEnter={() => setShowPopover(true)}
            onMouseLeave={() => setShowPopover(false)}
        >
          {isLoading && <div className="flex justify-center"><Spinner size={20} /></div>}
          {error && <div className="text-xs text-red-600 flex items-center"><AlertCircle size={14} className="mr-1"/> {error}</div>}
          {!isLoading && !error && resolvedData && <ResolvedDataDisplay data={resolvedData} />}
          {!isLoading && !error && !resolvedData && <p className="text-xs text-gray-500">No data or not yet resolved.</p>}
        </div>
      )}
    </span>
  );
}
