import { useState, useRef, useEffect } from "react";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import EditorPanel from "@/components/EditorPanel";
import PreviewPanel from "@/components/PreviewPanel";
import Split from "react-split";
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function Index() {
  const [activeFile, setActiveFile] = useState<string>("index.html");
  const [files, setFiles] = useState<Record<string, string>>({
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Project</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <h1>Hello, StackBlitz!</h1>
    <p>Start editing to see changes.</p>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
    "styles.css": `* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height:100vh; display:flex; align-items:center; justify-content:center; }
.container { background:white; padding:3rem; border-radius:12px; box-shadow:0 20px 60px rgba(0,0,0,0.3); text-align:center; }
h1 { color:#333; font-size:2.5rem; margin-bottom:1rem; }
p { color:#666; font-size:1.2rem; }`,
    "script.js": `console.log('Welcome to StackBlitz!');
document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.container');
  container.addEventListener('click', () => { console.log('Container clicked!'); });
});`,
    "package.json": `{
  "name": "my-project",
  "version": "1.0.0",
  "description": "A StackBlitz-like project",
  "main": "index.html",
  "scripts": { "start": "serve ." }
}`
  });

  const updateFileContent = (filename: string, content: string) => {
    setFiles(prev => ({ ...prev, [filename]: content }));
    codeRef.current = content; // sync with terminal
  };

  // Terminal state & refs
  const [termReady, setTermReady] = useState(false);
  const [terminalVisible, setTerminalVisible] = useState(true);
  const codeRef = useRef("// Hello StackBlitz!\nconsole.log('🚀 Zicon IDE');\n");
  const wcRef = useRef<WebContainer | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalDivRef = useRef<HTMLDivElement>(null);
  const inputWriterRef = useRef<any>(null);

  // Initialize terminal
  useEffect(() => {
    const initTerminal = async () => {
      const wc = await WebContainer.boot();
      wcRef.current = wc;

      await wc.mount({ "index.js": { file: { contents: codeRef.current } } });

      const term = new Terminal({
        fontSize: 12,
        cursorBlink: true,
        theme: { background: "#0d1117", foreground: "#c9d1d9" },
        scrollback: 1000
      });

      const fitAddon = new FitAddon();
      fitAddonRef.current = fitAddon;
      term.loadAddon(fitAddon);
      term.open(terminalDivRef.current!);
      fitAddon.fit();

      termRef.current = term;

      const sh = await wc.spawn("sh");
      sh.output.pipeTo(new WritableStream({
        write(data) { term.write(data); }
      }));

      inputWriterRef.current = sh.input.getWriter();
      term.onData((data) => inputWriterRef.current.write(data));

      term.write("\n$ Ready! Run: node index.js\n");
      setTermReady(true);
    };

    initTerminal();

    return () => {
      inputWriterRef.current?.close();
      termRef.current?.dispose();
    };
  }, []);

  // Fit terminal on resize
  useEffect(() => {
    if (!terminalDivRef.current) return;
    const ro = new ResizeObserver(() => fitAddonRef.current?.fit());
    ro.observe(terminalDivRef.current);
    return () => ro.disconnect();
  }, []);

  const runTerminalCode = async () => {
    if (!wcRef.current || !termRef.current) return;

    await wcRef.current.fs.writeFile("/index.js", codeRef.current);
    termRef.current.write("\n$ node index.js\n");

    const proc = await wcRef.current.spawn("node", ["index.js"]);
    proc.output.pipeTo(new WritableStream({
      write(data) { termRef.current!.write(data); }
    }));

    await proc.exit;
  };

  return (
    <div className="h-screen flex flex-col bg-[#1E1E1E] text-[#CCCCCC] overflow-hidden">
      <TopBar />

      <Split
        className="flex flex-col flex-1"
        sizes={terminalVisible ? [70, 30] : [100, 0]}
        minSize={[200, 0]}
        gutterSize={6}
        direction="vertical"
        expandToMin={true}
        onDragEnd={() => fitAddonRef.current?.fit()}
      >
        {/* Editor + Sidebar + Preview */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar files={files} activeFile={activeFile} onFileSelect={setActiveFile} />
          <EditorPanel 
            activeFile={activeFile} 
            content={files[activeFile] || ""} 
            onContentChange={(content) => updateFileContent(activeFile, content)} 
          />
          <PreviewPanel files={files} />
        </div>

        {/* Terminal */}
        <div className="flex flex-col h-full border-t border-[#30363d]">
          <div className="flex justify-between items-center bg-[#161b22] px-2 py-1 text-xs text-[#c9d1d9] border-b border-[#30363d]">
            <div className="flex items-center gap-2">
              <span>Terminal {termReady ? "●" : "Loading..."}</span>
              <button
                onClick={runTerminalCode}
                disabled={!termReady}
                className="bg-[#21262d] px-2 py-1 text-xs rounded hover:bg-[#30363d]"
              >
                Run
              </button>
            </div>
            <button
              onClick={() => setTerminalVisible(!terminalVisible)}
              className="bg-[#21262d] px-2 py-1 text-xs rounded hover:bg-[#30363d]"
            >
              {terminalVisible ? "Hide" : "Show"}
            </button>
          </div>
          <div
            ref={terminalDivRef}
            className="flex-1 h-full p-2 text-[11px]"
          />
        </div>
      </Split>
    </div>
  );
}

