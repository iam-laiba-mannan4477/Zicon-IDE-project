import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink } from 'lucide-react';

interface PreviewPanelProps {
  files: Record<string, string>;
}

export default function PreviewPanel({ files }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);

  const refreshPreview = () => {
    setKey(prev => prev + 1);
  };

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (iframeDoc) {
        const htmlContent = files['index.html'] || '';
        const cssContent = files['styles.css'] || '';
        const jsContent = files['script.js'] || '';
        
        const fullHTML = htmlContent
          .replace('</head>', `<style>${cssContent}</style></head>`)
          .replace('</body>', `<script>${jsContent}</script></body>`);
        
        iframeDoc.open();
        iframeDoc.write(fullHTML);
        iframeDoc.close();
      }
    }
  }, [files, key]);

  return (
    <div className="w-1/2 flex flex-col bg-[#1E1E1E] border-l border-[#3E3E42]">
      <div className="h-10 bg-[#252526] border-b border-[#3E3E42] flex items-center justify-between px-4">
        <span className="text-sm font-medium text-[#CCCCCC]">Preview</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshPreview}
            className="text-[#CCCCCC] hover:bg-[#333333] hover:text-white h-7 px-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#CCCCCC] hover:bg-[#333333] hover:text-white h-7 px-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 bg-white">
        <iframe
          ref={iframeRef}
          key={key}
          className="w-full h-full border-none"
          title="preview"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}