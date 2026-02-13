import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface EditorPanelProps {
  activeFile: string;
  content: string;
  onContentChange: (content: string) => void;
}

export default function EditorPanel({ activeFile, content, onContentChange }: EditorPanelProps) {
  const getLanguage = (filename: string) => {
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.js')) return 'javascript';
    if (filename.endsWith('.json')) return 'json';
    return 'text';
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1E1E1E]">
      <div className="h-10 bg-[#252526] border-b border-[#3E3E42] flex items-center">
        <div className="flex items-center gap-2 px-3 py-1 bg-[#1E1E1E] border-r border-[#3E3E42] h-full">
          <span className="text-sm text-[#CCCCCC]">{activeFile}</span>
          <button className="hover:bg-[#333333] rounded p-0.5">
            <X className="w-3 h-3 text-[#858585]" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 relative">
        <Textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          className="w-full h-full bg-[#1E1E1E] text-[#CCCCCC] border-none resize-none font-mono text-sm leading-relaxed p-4 focus-visible:ring-0 focus-visible:ring-offset-0"
          style={{
            fontFamily: "'Monaco', 'Menlo', 'Consolas', monospace",
            tabSize: 2,
          }}
          spellCheck={false}
        />
        
        <div className="absolute bottom-2 right-4 text-xs text-[#858585] bg-[#252526] px-2 py-1 rounded">
          {getLanguage(activeFile).toUpperCase()}
        </div>
      </div>
    </div>
  );
}