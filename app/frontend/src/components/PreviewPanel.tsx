import { RefreshCw, Globe, Smartphone, Tablet, Monitor, Loader2 } from "lucide-react";
import { useState, useRef, useCallback } from "react";

interface PreviewPanelProps {
  previewUrl: string | null;
  previewHtml: string;
  isLoading: boolean;
}

type DeviceMode = "desktop" | "tablet" | "mobile";

export default function PreviewPanel({
  previewUrl,
  previewHtml,
  isLoading,
}: PreviewPanelProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [urlInput, setUrlInput] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = useCallback(() => {
    if (iframeRef.current) {
      if (previewUrl) {
        iframeRef.current.src = previewUrl;
      } else if (previewHtml) {
        iframeRef.current.srcdoc = previewHtml;
      }
    }
  }, [previewUrl, previewHtml]);

  const getDeviceWidth = () => {
    switch (deviceMode) {
      case "mobile":
        return "375px";
      case "tablet":
        return "768px";
      default:
        return "100%";
    }
  };

  const hasContent = previewUrl || previewHtml;
  const displayUrl = previewUrl || urlInput || "http://localhost:5173";

  return (
    <div className="h-full flex flex-col bg-[#1E1E1E]">
      {/* Preview Toolbar */}
      <div className="h-[35px] bg-[#252526] border-b border-[#3E3E42] flex items-center px-2 gap-2 shrink-0">
        <button
          onClick={handleRefresh}
          className="hover:bg-[#333333] rounded p-1 text-[#858585] hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* URL Bar */}
        <div className="flex-1 flex items-center bg-[#1E1E1E] rounded border border-[#3E3E42] px-2 h-6">
          <Globe className="w-3 h-3 text-[#858585] mr-1.5 shrink-0" />
          <input
            value={displayUrl}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 bg-transparent text-[#CCCCCC] text-xs outline-none"
            readOnly={!!previewUrl}
          />
        </div>

        {/* Device Toggles */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setDeviceMode("desktop")}
            className={`p-1 rounded transition-colors ${
              deviceMode === "desktop"
                ? "text-[#007ACC] bg-[#333333]"
                : "text-[#858585] hover:text-white"
            }`}
            title="Desktop"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeviceMode("tablet")}
            className={`p-1 rounded transition-colors ${
              deviceMode === "tablet"
                ? "text-[#007ACC] bg-[#333333]"
                : "text-[#858585] hover:text-white"
            }`}
            title="Tablet"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeviceMode("mobile")}
            className={`p-1 rounded transition-colors ${
              deviceMode === "mobile"
                ? "text-[#007ACC] bg-[#333333]"
                : "text-[#858585] hover:text-white"
            }`}
            title="Mobile"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 flex items-center justify-center bg-[#1E1E1E] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 text-[#858585]">
            <Loader2 className="w-8 h-8 animate-spin text-[#007ACC]" />
            <p className="text-sm">Starting dev server...</p>
          </div>
        ) : hasContent ? (
          <div
            className="h-full bg-white transition-all duration-300"
            style={{
              width: getDeviceWidth(),
              maxWidth: "100%",
              margin: deviceMode !== "desktop" ? "0 auto" : undefined,
              boxShadow:
                deviceMode !== "desktop"
                  ? "0 0 20px rgba(0,0,0,0.5)"
                  : "none",
              borderRadius: deviceMode !== "desktop" ? "8px" : "0",
              overflow: "hidden",
            }}
          >
            {previewUrl ? (
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className="w-full h-full border-none"
                title="Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            ) : (
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                className="w-full h-full border-none"
                title="Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            )}
          </div>
        ) : (
          <div className="text-center space-y-3 text-[#858585]">
            <div className="w-16 h-16 mx-auto bg-[#252526] rounded-xl flex items-center justify-center">
              <Globe className="w-8 h-8 text-[#555]" />
            </div>
            <p className="text-sm">No preview available</p>
            <p className="text-xs">
              Click <span className="text-[#4EC9B0]">Run</span> to start the
              dev server and see your app here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}