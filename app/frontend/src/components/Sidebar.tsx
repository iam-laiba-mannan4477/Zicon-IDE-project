import { FileCode, FileJson, FileType, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  files: Record<string, string>;
  activeFile: string;
  onFileSelect: (filename: string) => void;
}

export default function Sidebar({ files, activeFile, onFileSelect }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.html')) return <FileCode className="w-4 h-4 text-[#E34C26]" />;
    if (filename.endsWith('.css')) return <FileType className="w-4 h-4 text-[#264DE4]" />;
    if (filename.endsWith('.js')) return <FileCode className="w-4 h-4 text-[#F7DF1E]" />;
    if (filename.endsWith('.json')) return <FileJson className="w-4 h-4 text-[#4EC9B0]" />;
    return <FileCode className="w-4 h-4 text-[#858585]" />;
  };

  return (
    <div className="w-64 bg-[#252526] border-r border-[#3E3E42] flex flex-col">
      <div className="p-3 border-b border-[#3E3E42]">
        <div className="text-xs font-semibold text-[#858585] uppercase tracking-wider">
          Explorer
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div 
            className="flex items-center gap-1 px-2 py-1 hover:bg-[#2A2D2E] cursor-pointer rounded"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-[#858585]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#858585]" />
            )}
            <Folder className="w-4 h-4 text-[#DCAA5F]" />
            <span className="text-sm font-medium">my-project</span>
          </div>
          
          {isExpanded && (
            <div className="ml-4 mt-1">
              {Object.keys(files).map((filename) => (
                <div
                  key={filename}
                  className={`flex items-center gap-2 px-2 py-1 hover:bg-[#2A2D2E] cursor-pointer rounded text-sm ${
                    activeFile === filename ? 'bg-[#37373D]' : ''
                  }`}
                  onClick={() => onFileSelect(filename)}
                >
                  {getFileIcon(filename)}
                  <span className={activeFile === filename ? 'text-white' : 'text-[#CCCCCC]'}>
                    {filename}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}