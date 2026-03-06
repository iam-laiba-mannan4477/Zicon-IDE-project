import { X, FileCode, FileJson, FileType, File as FileIcon } from "lucide-react";
import { useRef, useCallback, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  theme: "dark" | "light";
}

interface EditorPanelProps {
  activeFile: string;
  content: string;
  openFiles: string[];
  settings: EditorSettings;
  onContentChange: (content: string) => void;
  onFileSelect: (filepath: string) => void;
  onCloseFile: (filepath: string) => void;
}

function getLanguageFromFile(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    md: "markdown",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    sh: "shell",
    bash: "shell",
    yml: "yaml",
    yaml: "yaml",
    xml: "xml",
    svg: "xml",
    sql: "sql",
    graphql: "graphql",
    dockerfile: "dockerfile",
    makefile: "makefile",
    toml: "ini",
    env: "ini",
    gitignore: "ini",
  };
  return map[ext] || "plaintext";
}

function getFileIcon(filename: string) {
  const name = filename.split("/").pop() || filename;
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "html":
      return <FileCode className="w-3.5 h-3.5 text-[#E34C26]" />;
    case "css":
    case "scss":
    case "less":
      return <FileType className="w-3.5 h-3.5 text-[#264DE4]" />;
    case "js":
    case "jsx":
      return <FileCode className="w-3.5 h-3.5 text-[#F7DF1E]" />;
    case "ts":
    case "tsx":
      return <FileCode className="w-3.5 h-3.5 text-[#3178C6]" />;
    case "json":
      return <FileJson className="w-3.5 h-3.5 text-[#4EC9B0]" />;
    default:
      return <FileIcon className="w-3.5 h-3.5 text-[#858585]" />;
  }
}

export default function EditorPanel({
  activeFile,
  content,
  openFiles,
  settings,
  onContentChange,
  onFileSelect,
  onCloseFile,
}: EditorPanelProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = useCallback((ed) => {
    editorRef.current = ed;
    ed.focus();
  }, []);

  // Update editor options when settings change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: settings.fontSize,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap ? "on" : "off",
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers ? "on" : "off",
      });
    }
  }, [settings]);

  const displayName = (filepath: string) =>
    filepath.split("/").pop() || filepath;

  const language = activeFile ? getLanguageFromFile(activeFile) : "plaintext";
  const monacoTheme = settings.theme === "dark" ? "vs-dark" : "vs";

  return (
    <div className="flex-1 flex flex-col bg-[#1E1E1E] min-w-0 h-full">
      {/* Tabs */}
      <div className="h-[35px] bg-[#252526] border-b border-[#3E3E42] flex items-center overflow-x-auto scrollbar-none shrink-0">
        {openFiles.map((file) => (
          <div
            key={file}
            className={`flex items-center gap-1.5 px-3 h-full border-r border-[#3E3E42] cursor-pointer shrink-0 ${
              activeFile === file
                ? "bg-[#1E1E1E] text-white"
                : "bg-[#2D2D2D] text-[#858585] hover:text-[#CCCCCC]"
            }`}
            onClick={() => onFileSelect(file)}
          >
            {getFileIcon(file)}
            <span className="text-xs">{displayName(file)}</span>
            <button
              className="hover:bg-[#333333] rounded p-0.5 ml-1"
              onClick={(e) => {
                e.stopPropagation();
                onCloseFile(file);
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Editor */}
      {activeFile && openFiles.length > 0 ? (
        <div className="flex-1 overflow-hidden">
          <Editor
            key={activeFile}
            height="100%"
            language={language}
            theme={monacoTheme}
            value={content}
            onChange={(value) => onContentChange(value || "")}
            onMount={handleEditorMount}
            options={{
              fontSize: settings.fontSize,
              tabSize: settings.tabSize,
              wordWrap: settings.wordWrap ? "on" : "off",
              minimap: { enabled: settings.minimap },
              lineNumbers: settings.lineNumbers ? "on" : "off",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 8 },
              renderLineHighlight: "line",
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              smoothScrolling: true,
              bracketPairColorization: { enabled: true },
              guides: {
                bracketPairs: true,
                indentation: true,
              },
              suggest: {
                showKeywords: true,
                showSnippets: true,
              },
              quickSuggestions: true,
              parameterHints: { enabled: true },
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[#858585]">
          <div className="text-center space-y-2">
            <div className="text-4xl font-bold text-[#333333]">ZI</div>
            <p className="text-sm">Welcome to Zicon-IDE</p>
            <p className="text-xs">
              Open a file from the explorer to start editing
            </p>
          </div>
        </div>
      )}
    </div>
  );
}