import { useState, useCallback, useRef, useEffect } from "react";
import type { Terminal as XTerminal } from "@xterm/xterm";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import EditorPanel from "@/components/EditorPanel";
import type { EditorSettings } from "@/components/EditorPanel";
import PreviewPanel from "@/components/PreviewPanel";
import TerminalPanel from "@/components/TerminalPanel";
import SettingsDialog from "@/components/SettingsDialog";
import CloneDialog from "@/components/CloneDialog";
import ExtensionsPanel from "@/components/ExtensionsPanel";
import { Files, Puzzle, Search, GitBranch } from "lucide-react";

// ── Starter project files ──
const scriptEnd = "<" + "/script>";

const STARTER_FILES: Record<string, string> = {
  "package.json": JSON.stringify(
    {
      name: "zicon-project",
      private: true,
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview",
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.2.1",
        vite: "^5.1.0",
      },
    },
    null,
    2
  ),
  "vite.config.js": `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});`,
  "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zicon Project</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx">${scriptEnd}
</body>
</html>`,
  "src/main.jsx": `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
  "src/App.jsx": `import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <header className="header">
        <h1>Welcome to Zicon-IDE</h1>
        <p>Edit <code>src/App.jsx</code> and save to see changes!</p>
      </header>
      <div className="card">
        <button onClick={() => setCount(c => c + 1)}>
          Count: {count}
        </button>
      </div>
    </div>
  );
}

export default App;`,
  "src/App.css": `.app {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.header h1 {
  font-size: 2.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header p {
  color: #666;
  margin-top: 0.5rem;
}

code {
  background: #f0f0f0;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.card {
  margin-top: 2rem;
}

.card button {
  padding: 0.8rem 1.6rem;
  font-size: 1rem;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.card button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}`,
  "src/index.css": `*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}`,
};

// ── Helper: build FileNode tree for Sidebar ──
interface FileNode {
  name: string;
  type: "file" | "directory";
  children?: FileNode[];
}

function buildFileTree(files: Record<string, string>): FileNode[] {
  const root: FileNode = { name: ".", type: "directory", children: [] };
  const dirMap: Record<string, FileNode> = { ".": root };

  const ensureDir = (dirPath: string): FileNode => {
    if (dirMap[dirPath]) return dirMap[dirPath];
    const parts = dirPath.split("/");
    const parentPath = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
    const parent = ensureDir(parentPath);
    const node: FileNode = {
      name: parts[parts.length - 1],
      type: "directory",
      children: [],
    };
    parent.children = parent.children || [];
    if (
      !parent.children.find(
        (c) => c.name === node.name && c.type === "directory"
      )
    ) {
      parent.children.push(node);
    }
    dirMap[dirPath] = node;
    return node;
  };

  const sortedPaths = Object.keys(files).sort();
  for (const filepath of sortedPaths) {
    const parts = filepath.split("/");
    if (parts.length > 1) {
      ensureDir(parts.slice(0, -1).join("/"));
    }
    const parentPath = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
    const parent = ensureDir(parentPath);
    parent.children = parent.children || [];
    const fileName = parts[parts.length - 1];
    if (
      !parent.children.find((c) => c.name === fileName && c.type === "file")
    ) {
      parent.children.push({ name: fileName, type: "file" });
    }
  }

  const sortChildren = (node: FileNode) => {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortChildren);
    }
  };
  sortChildren(root);

  return root.children || [];
}

// ── Build preview HTML from project files (fallback when no WebContainer) ──
function buildPreviewHtml(files: Record<string, string>): string {
  const appJsx = files["src/App.jsx"] || "";
  const appCss = files["src/App.css"] || "";
  const indexCss = files["src/index.css"] || "";
  const se = "<" + "/script>";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin>${se}
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin>${se}
  <script src="https://unpkg.com/@babel/standalone/babel.min.js">${se}
  <style>
${indexCss}
${appCss}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-type="module">
${appJsx
  .replace(/import\s+.*?from\s+['"].*?['"]\s*;?/g, "")
  .replace(/export\s+default\s+/, "window.__App__ = ")}

const App = window.__App__;
if (App) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    React.createElement(React.StrictMode, null, React.createElement(App))
  );
}
  ${se}
</body>
</html>`;
}

// ── WebContainer file tree builder ──
function buildWCFileTree(
  files: Record<string, string>
): Record<string, unknown> {
  const tree: Record<string, unknown> = {};
  for (const [path, contents] of Object.entries(files)) {
    const parts = path.split("/");
    let current = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = { directory: {} };
      }
      current = (current[parts[i]] as { directory: Record<string, unknown> })
        .directory;
    }
    current[parts[parts.length - 1]] = { file: { contents } };
  }
  return tree;
}

// WebContainer typed interface
interface WCInstance {
  mount: (tree: Record<string, unknown>) => Promise<void>;
  spawn: (
    cmd: string,
    args: string[]
  ) => Promise<{
    output: ReadableStream;
    exit: Promise<number>;
    kill: () => void;
  }>;
  on: (event: string, cb: (port: number, url: string) => void) => void;
  fs: {
    writeFile: (path: string, content: string) => Promise<void>;
    mkdir: (path: string, opts?: { recursive?: boolean }) => Promise<void>;
    rm: (path: string, opts?: { recursive?: boolean }) => Promise<void>;
    readdir: (path: string) => Promise<string[]>;
    rename: (oldPath: string, newPath: string) => Promise<void>;
    readFile: (path: string, encoding: string) => Promise<string>;
  };
}

type SidebarView = "files" | "search" | "git" | "extensions";

export default function Index() {
  const [files, setFiles] = useState<Record<string, string>>({
    ...STARTER_FILES,
  });
  const [activeFile, setActiveFile] = useState<string>("src/App.jsx");
  const [openFiles, setOpenFiles] = useState<string[]>(["src/App.jsx"]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<SidebarView>("files");
  const [enabledExtensions, setEnabledExtensions] = useState<Set<string>>(
    new Set(["bracket-colorizer", "emmet"])
  );
  const [wcAvailable, setWcAvailable] = useState(false);
  const [useSimulatedPreview, setUseSimulatedPreview] = useState(false);
  const [projectName, setProjectName] = useState("zicon-project");
  const [settings, setSettings] = useState<EditorSettings>({
    fontSize: 14,
    tabSize: 2,
    wordWrap: false,
    minimap: false,
    lineNumbers: true,
    theme: "dark",
  });

  const wcRef = useRef<WCInstance | null>(null);
  const terminalsRef = useRef<Map<string, XTerminal>>(new Map());
  const processRef = useRef<{ kill: () => void } | null>(null);
  const bootingRef = useRef(false);

  const fileTree = buildFileTree(files);

  // Check WebContainer availability
  useEffect(() => {
    const isIsolated =
      typeof window !== "undefined" &&
      "crossOriginIsolated" in window &&
      window.crossOriginIsolated;
    setWcAvailable(!!isIsolated);
  }, []);

  // ── Get terminal helper ──
  const getTerminal = useCallback((): XTerminal | undefined => {
    return terminalsRef.current.values().next().value as XTerminal | undefined;
  }, []);

  // ── Boot WebContainer ──
  const bootWebContainer = useCallback(async (): Promise<WCInstance | null> => {
    if (!wcAvailable) return null;
    if (wcRef.current) return wcRef.current;
    if (bootingRef.current) return null;
    bootingRef.current = true;

    const terminal = getTerminal();

    try {
      terminal?.writeln("\x1b[1;33m⚡ Booting WebContainer...\x1b[0m");
      const { WebContainer } = await import("@webcontainer/api");
      const wc = (await WebContainer.boot()) as unknown as WCInstance;
      wcRef.current = wc;

      terminal?.writeln(
        "\x1b[1;32m✓ WebContainer booted successfully\x1b[0m"
      );

      // Mount files
      const tree = buildWCFileTree(files);
      await wc.mount(tree);
      terminal?.writeln(
        `\x1b[1;32m✓ Mounted ${Object.keys(files).length} files\x1b[0m`
      );

      // Listen for server-ready
      wc.on("server-ready", (_port: number, url: string) => {
        setPreviewUrl(url);
        setIsLoading(false);
        terminal?.writeln(
          `\x1b[1;32m✓ Dev server ready at ${url}\x1b[0m`
        );
      });

      return wc;
    } catch (err) {
      terminal?.writeln(
        `\x1b[1;31m✗ Failed to boot WebContainer: ${err}\x1b[0m`
      );
      bootingRef.current = false;
      return null;
    }
  }, [wcAvailable, files, getTerminal]);

  // ── Run project ──
  const handleRun = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setIsLoading(true);
    setPreviewUrl(null);

    const terminal = getTerminal();

    if (wcAvailable) {
      const wc = await bootWebContainer();
      if (!wc) {
        // Fallback to simulated preview
        setUseSimulatedPreview(true);
        terminal?.writeln(
          "\x1b[1;33m⚠ Falling back to simulated preview\x1b[0m"
        );
        setPreviewHtml(buildPreviewHtml(files));
        setIsLoading(false);
        return;
      }

      try {
        // Re-mount latest files
        const tree = buildWCFileTree(files);
        await wc.mount(tree);

        terminal?.writeln("\x1b[1;34m$ npm install\x1b[0m");
        const installProcess = await wc.spawn("npm", ["install"]);
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              terminal?.write(data);
            },
          })
        );

        const exitCode = await installProcess.exit;
        if (exitCode !== 0) {
          terminal?.writeln(
            `\x1b[1;31m✗ npm install failed (exit ${exitCode})\x1b[0m`
          );
          setIsRunning(false);
          setIsLoading(false);
          return;
        }

        terminal?.writeln("\x1b[1;32m✓ Dependencies installed\x1b[0m");
        terminal?.writeln("\x1b[1;34m$ npm run dev\x1b[0m");

        const devProcess = await wc.spawn("npm", ["run", "dev"]);
        processRef.current = devProcess;
        devProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              terminal?.write(data);
            },
          })
        );
      } catch (err) {
        terminal?.writeln(`\x1b[1;31m✗ Error: ${err}\x1b[0m`);
        setIsRunning(false);
        setIsLoading(false);
      }
    } else {
      // Simulated preview
      setUseSimulatedPreview(true);
      terminal?.writeln("\x1b[1;34m$ npm install\x1b[0m");
      await new Promise((r) => setTimeout(r, 600));
      terminal?.writeln("\x1b[90m  + react@18.2.0\x1b[0m");
      await new Promise((r) => setTimeout(r, 200));
      terminal?.writeln("\x1b[90m  + react-dom@18.2.0\x1b[0m");
      await new Promise((r) => setTimeout(r, 200));
      terminal?.writeln("\x1b[90m  + vite@5.1.0\x1b[0m");
      terminal?.writeln("");
      terminal?.writeln("\x1b[1;32madded 4 packages in 1.6s\x1b[0m");
      terminal?.writeln("");
      terminal?.writeln("\x1b[1;34m$ npm run dev\x1b[0m");
      await new Promise((r) => setTimeout(r, 400));
      terminal?.writeln("\x1b[1;36m  VITE v5.1.0  ready in 320 ms\x1b[0m");
      terminal?.writeln("");
      terminal?.writeln(
        "  \x1b[1;32m➜\x1b[0m  \x1b[1mLocal:\x1b[0m   http://localhost:5173/"
      );
      terminal?.writeln("");

      setPreviewHtml(buildPreviewHtml(files));
      setIsLoading(false);
    }
  }, [isRunning, wcAvailable, bootWebContainer, files, getTerminal]);

  // ── Stop ──
  const handleStop = useCallback(() => {
    if (processRef.current) {
      processRef.current.kill();
      processRef.current = null;
    }
    setIsRunning(false);
    setIsLoading(false);
    setPreviewUrl(null);
    setPreviewHtml("");
    setUseSimulatedPreview(false);

    const terminal = getTerminal();
    terminal?.writeln("\x1b[1;33m■ Process stopped\x1b[0m");
  }, [getTerminal]);

  // Auto-update preview when files change (simulated mode)
  useEffect(() => {
    if (isRunning && useSimulatedPreview) {
      setPreviewHtml(buildPreviewHtml(files));
    }
  }, [files, isRunning, useSimulatedPreview]);

  // ── Sync file changes to WebContainer ──
  const syncFileToWC = useCallback(
    async (filepath: string, content: string) => {
      if (!wcRef.current) return;
      try {
        // Ensure parent directories exist
        const parts = filepath.split("/");
        if (parts.length > 1) {
          const dir = parts.slice(0, -1).join("/");
          await wcRef.current.fs.mkdir(dir, { recursive: true });
        }
        await wcRef.current.fs.writeFile(filepath, content);
      } catch {
        // Ignore errors silently
      }
    },
    []
  );

  // ── File operations ──
  const handleFileSelect = useCallback(
    (filepath: string) => {
      if (files[filepath] === undefined) return;
      setActiveFile(filepath);
      if (!openFiles.includes(filepath)) {
        setOpenFiles((prev) => [...prev, filepath]);
      }
    },
    [openFiles, files]
  );

  const handleCloseFile = useCallback(
    (filepath: string) => {
      setOpenFiles((prev) => {
        const next = prev.filter((f) => f !== filepath);
        if (activeFile === filepath) {
          setActiveFile(next[next.length - 1] || "");
        }
        return next;
      });
    },
    [activeFile]
  );

  const handleContentChange = useCallback(
    (content: string) => {
      if (!activeFile) return;
      setFiles((prev) => ({ ...prev, [activeFile]: content }));
      syncFileToWC(activeFile, content);
    },
    [activeFile, syncFileToWC]
  );

  const handleCreateFile = useCallback(
    (dirPath: string, name: string) => {
      const fullPath = dirPath === "." ? name : `${dirPath}/${name}`;
      if (files[fullPath] !== undefined) {
        toast.error(`File "${name}" already exists`);
        return;
      }
      setFiles((prev) => ({ ...prev, [fullPath]: "" }));
      setActiveFile(fullPath);
      setOpenFiles((prev) =>
        prev.includes(fullPath) ? prev : [...prev, fullPath]
      );
      syncFileToWC(fullPath, "");
      toast.success(`Created ${name}`);
    },
    [files, syncFileToWC]
  );

  const handleCreateFolder = useCallback(
    (dirPath: string, name: string) => {
      const fullPath = dirPath === "." ? name : `${dirPath}/${name}`;
      const gitkeepPath = `${fullPath}/.gitkeep`;
      setFiles((prev) => ({ ...prev, [gitkeepPath]: "" }));
      // Create directory in WebContainer
      if (wcRef.current) {
        wcRef.current.fs.mkdir(fullPath, { recursive: true }).catch(() => {});
      }
      toast.success(`Created folder ${name}`);
    },
    []
  );

  const handleDeleteFile = useCallback(
    (filepath: string) => {
      setFiles((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (key === filepath || key.startsWith(filepath + "/")) {
            delete next[key];
          }
        }
        return next;
      });

      setOpenFiles((prev) =>
        prev.filter(
          (f) => f !== filepath && !f.startsWith(filepath + "/")
        )
      );
      if (
        activeFile === filepath ||
        activeFile.startsWith(filepath + "/")
      ) {
        setActiveFile("");
      }

      // Delete in WebContainer
      if (wcRef.current) {
        wcRef.current.fs.rm(filepath, { recursive: true }).catch(() => {});
      }

      toast.success(`Deleted ${filepath.split("/").pop()}`);
    },
    [activeFile]
  );

  const handleRenameFile = useCallback(
    (oldPath: string, newName: string) => {
      const parts = oldPath.split("/");
      parts[parts.length - 1] = newName;
      const newPath = parts.join("/");

      setFiles((prev) => {
        const next = { ...prev };
        const keysToRename: [string, string][] = [];
        for (const key of Object.keys(next)) {
          if (key === oldPath) {
            keysToRename.push([key, newPath]);
          } else if (key.startsWith(oldPath + "/")) {
            keysToRename.push([key, newPath + key.slice(oldPath.length)]);
          }
        }
        for (const [oldKey, newKey] of keysToRename) {
          next[newKey] = next[oldKey];
          delete next[oldKey];
        }
        return next;
      });

      setOpenFiles((prev) =>
        prev.map((f) => {
          if (f === oldPath) return newPath;
          if (f.startsWith(oldPath + "/"))
            return newPath + f.slice(oldPath.length);
          return f;
        })
      );
      if (activeFile === oldPath) {
        setActiveFile(newPath);
      } else if (activeFile.startsWith(oldPath + "/")) {
        setActiveFile(newPath + activeFile.slice(oldPath.length));
      }

      // Rename in WebContainer (read + write + delete old)
      if (wcRef.current) {
        const wc = wcRef.current;
        wc.fs
          .readFile(oldPath, "utf-8")
          .then((content) => {
            const dir = newPath.split("/").slice(0, -1).join("/");
            if (dir) {
              return wc.fs
                .mkdir(dir, { recursive: true })
                .then(() => wc.fs.writeFile(newPath, content))
                .then(() => wc.fs.rm(oldPath, { recursive: true }));
            }
            return wc.fs
              .writeFile(newPath, content)
              .then(() => wc.fs.rm(oldPath, { recursive: true }));
          })
          .catch(() => {});
      }

      toast.success(`Renamed to ${newName}`);
    },
    [activeFile]
  );

  const handleMoveFile = useCallback(
    (sourcePath: string, targetDir: string) => {
      const fileName = sourcePath.split("/").pop() || sourcePath;
      const newPath =
        targetDir === "." ? fileName : `${targetDir}/${fileName}`;

      if (sourcePath === newPath) return;

      // Check if target already exists
      if (files[newPath] !== undefined) {
        toast.error(`"${fileName}" already exists in ${targetDir === "." ? "root" : targetDir}`);
        return;
      }

      setFiles((prev) => {
        const next = { ...prev };
        const keysToMove: [string, string][] = [];

        for (const key of Object.keys(next)) {
          if (key === sourcePath) {
            keysToMove.push([key, newPath]);
          } else if (key.startsWith(sourcePath + "/")) {
            keysToMove.push([key, newPath + key.slice(sourcePath.length)]);
          }
        }

        for (const [oldKey, newKey] of keysToMove) {
          next[newKey] = next[oldKey];
          delete next[oldKey];
        }
        return next;
      });

      setOpenFiles((prev) =>
        prev.map((f) => {
          if (f === sourcePath) return newPath;
          if (f.startsWith(sourcePath + "/"))
            return newPath + f.slice(sourcePath.length);
          return f;
        })
      );

      if (activeFile === sourcePath) {
        setActiveFile(newPath);
      } else if (activeFile.startsWith(sourcePath + "/")) {
        setActiveFile(newPath + activeFile.slice(sourcePath.length));
      }

      // Move in WebContainer
      if (wcRef.current) {
        const wc = wcRef.current;
        const dir = newPath.split("/").slice(0, -1).join("/");
        const moveOp = dir
          ? wc.fs
              .mkdir(dir, { recursive: true })
              .then(() => wc.fs.readFile(sourcePath, "utf-8"))
          : wc.fs.readFile(sourcePath, "utf-8");

        moveOp
          .then((content) =>
            wc.fs
              .writeFile(newPath, content)
              .then(() => wc.fs.rm(sourcePath, { recursive: true }))
          )
          .catch(() => {});
      }

      toast.success(
        `Moved ${fileName} to ${targetDir === "." ? "root" : targetDir}`
      );
    },
    [activeFile, files]
  );

  // ── Clone ──
  const handleClone = useCallback(
    (clonedFiles: Record<string, string>, repoName: string) => {
      setFiles(clonedFiles);
      setProjectName(repoName);
      setOpenFiles([]);
      setActiveFile("");
      setPreviewUrl(null);
      setPreviewHtml("");
      setIsRunning(false);
      setUseSimulatedPreview(false);

      // Reset WebContainer
      wcRef.current = null;
      bootingRef.current = false;

      // Auto-open first interesting file
      const priorities = [
        "src/App.jsx",
        "src/App.tsx",
        "src/index.js",
        "src/index.ts",
        "src/main.jsx",
        "src/main.tsx",
        "index.html",
        "README.md",
      ];
      for (const p of priorities) {
        if (clonedFiles[p] !== undefined) {
          setActiveFile(p);
          setOpenFiles([p]);
          break;
        }
      }
    },
    []
  );

  // ── Download ──
  const handleDownload = useCallback(async () => {
    const zip = new JSZip();
    for (const [path, content] of Object.entries(files)) {
      zip.file(path, content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${projectName}.zip`);
    toast.success("Project downloaded as ZIP!");
  }, [files, projectName]);

  // ── Fork ──
  const handleFork = useCallback(() => {
    setFiles({ ...files });
    toast.success("Project forked! You are now working on a copy.");
  }, [files]);

  // ── Extensions ──
  const handleExtensionToggle = useCallback(
    (extId: string, enabled: boolean) => {
      setEnabledExtensions((prev) => {
        const next = new Set(prev);
        if (enabled) next.add(extId);
        else next.delete(extId);
        return next;
      });
    },
    []
  );

  // ── Terminal callbacks ──
  const handleTerminalReady = useCallback(
    (terminal: XTerminal, id: string) => {
      terminalsRef.current.set(id, terminal);
    },
    []
  );

  const handleTerminalInput = useCallback(
    (_data: string, _id: string) => {
      // Forward to WebContainer shell if available
    },
    []
  );

  const sidebarIcons: {
    view: SidebarView;
    icon: React.ReactNode;
    label: string;
  }[] = [
    { view: "files", icon: <Files className="w-5 h-5" />, label: "Explorer" },
    { view: "search", icon: <Search className="w-5 h-5" />, label: "Search" },
    {
      view: "git",
      icon: <GitBranch className="w-5 h-5" />,
      label: "Source Control",
    },
    {
      view: "extensions",
      icon: <Puzzle className="w-5 h-5" />,
      label: "Extensions",
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#1E1E1E] text-[#CCCCCC] overflow-hidden">
      <TopBar
        projectName={projectName}
        isRunning={isRunning}
        onRun={handleRun}
        onStop={handleStop}
        onDownload={handleDownload}
        onSettingsOpen={() => setSettingsOpen(true)}
        onFork={handleFork}
        onCloneOpen={() => setCloneOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <div className="w-12 bg-[#333333] border-r border-[#3E3E42] flex flex-col items-center py-2 gap-1 shrink-0">
          {sidebarIcons.map(({ view, icon, label }) => (
            <button
              key={view}
              onClick={() =>
                setSidebarView((prev) => (prev === view ? prev : view))
              }
              className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                sidebarView === view
                  ? "text-white bg-[#505050] border-l-2 border-[#007ACC]"
                  : "text-[#858585] hover:text-white"
              }`}
              title={label}
            >
              {icon}
            </button>
          ))}
        </div>

        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Sidebar Panel */}
          <ResizablePanel defaultSize={18} minSize={12} maxSize={30}>
            {sidebarView === "files" && (
              <Sidebar
                fileTree={fileTree}
                activeFile={activeFile}
                openFiles={openFiles}
                onFileSelect={handleFileSelect}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onDeleteFile={handleDeleteFile}
                onRenameFile={handleRenameFile}
                onMoveFile={handleMoveFile}
              />
            )}
            {sidebarView === "extensions" && (
              <ExtensionsPanel
                onExtensionToggle={handleExtensionToggle}
                enabledExtensions={enabledExtensions}
              />
            )}
            {sidebarView === "search" && (
              <div className="h-full bg-[#252526] p-3">
                <span className="text-xs font-semibold text-[#858585] uppercase tracking-wider">
                  Search
                </span>
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Search files..."
                    className="w-full bg-[#1E1E1E] border border-[#3E3E42] text-[#CCCCCC] text-sm px-2 py-1 rounded outline-none focus:border-[#007ACC] placeholder:text-[#555]"
                  />
                </div>
                <p className="text-xs text-[#858585] mt-3">
                  Type to search across all files in the project.
                </p>
              </div>
            )}
            {sidebarView === "git" && (
              <div className="h-full bg-[#252526] p-3">
                <span className="text-xs font-semibold text-[#858585] uppercase tracking-wider">
                  Source Control
                </span>
                <p className="text-xs text-[#858585] mt-3">
                  No Git repository initialized. Use the Clone button to import
                  a GitHub repository.
                </p>
              </div>
            )}
          </ResizablePanel>

          <ResizableHandle className="w-[1px] bg-[#3E3E42] hover:bg-[#007ACC] transition-colors" />

          {/* Editor + Terminal */}
          <ResizablePanel defaultSize={42} minSize={20}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={65} minSize={20}>
                <EditorPanel
                  activeFile={activeFile}
                  content={activeFile ? files[activeFile] ?? "" : ""}
                  openFiles={openFiles}
                  settings={settings}
                  onContentChange={handleContentChange}
                  onFileSelect={handleFileSelect}
                  onCloseFile={handleCloseFile}
                />
              </ResizablePanel>

              <ResizableHandle className="h-[1px] bg-[#3E3E42] hover:bg-[#007ACC] transition-colors" />

              <ResizablePanel defaultSize={35} minSize={10}>
                <TerminalPanel
                  onTerminalReady={handleTerminalReady}
                  onTerminalInput={handleTerminalInput}
                  webContainerAvailable={wcAvailable}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle className="w-[1px] bg-[#3E3E42] hover:bg-[#007ACC] transition-colors" />

          {/* Preview */}
          <ResizablePanel defaultSize={40} minSize={20}>
            <PreviewPanel
              previewUrl={previewUrl}
              previewHtml={previewHtml}
              isLoading={isLoading}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSettingsChange={setSettings}
      />

      <CloneDialog
        open={cloneOpen}
        onOpenChange={setCloneOpen}
        onClone={handleClone}
      />
    </div>
  );
}