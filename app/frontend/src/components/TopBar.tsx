import { Button } from '@/components/ui/button';
import { Play, Share2, Download, Settings } from 'lucide-react';

export default function TopBar() {
  return (
    <div className="h-12 bg-[#252526] border-b border-[#3E3E42] flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#007ACC] rounded flex items-center justify-center font-bold text-white">
            SB
          </div>
          <span className="font-semibold text-sm">my-project</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-[#CCCCCC] hover:bg-[#333333] hover:text-white h-8"
        >
          <Play className="w-4 h-4 mr-1" />
          Run
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-[#CCCCCC] hover:bg-[#333333] hover:text-white h-8"
        >
          <Share2 className="w-4 h-4 mr-1" />
          Share
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-[#CCCCCC] hover:bg-[#333333] hover:text-white h-8"
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-[#CCCCCC] hover:bg-[#333333] hover:text-white h-8"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}