import { useEffect, useRef, useCallback, useState } from "react";
import { Terminal as XTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { Plus, X, Terminal as TerminalIcon } from "lucide-react";
import io from "socket.io-client";

interface TerminalInstance {
  id: string;
  name: string;
  terminal: XTerminal;
  fitAddon: FitAddon;
  containerEl: HTMLDivElement | null;
  socket?: any; // Socket.io connection
}

interface TerminalPanelProps {
  onTerminalReady?: (terminal: XTerminal, id: string) => void;
  onTerminalInput?: (data: string, id: string) => void;
  webContainerAvailable: boolean;
}

export default function TerminalPanel({
  onTerminalReady,
  onTerminalInput,
  webContainerAvailable,
}: TerminalPanelProps) {
  const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string>("");
  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const terminalCounter = useRef(0);
  const initDone = useRef(false);

  const createTerminalInstance = useCallback(
    (name?: string): TerminalInstance => {
      terminalCounter.current += 1;
      const id = `terminal-${terminalCounter.current}`;
      const termName = name || `Terminal ${terminalCounter.current}`;

      const xterm = new XTerminal({
        theme: {
          background: "#1E1E1E",
          foreground: "#CCCCCC",
          cursor: "#CCCCCC",
          selectionBackground: "#264F78",
          black: "#1E1E1E",
          red: "#F44747",
          green: "#4EC9B0",
          yellow: "#DCAA5F",
          blue: "#007ACC",
          magenta: "#C586C0",
          cyan: "#4FC1FF",
          white: "#CCCCCC",
          brightBlack: "#858585",
          brightRed: "#F44747",
          brightGreen: "#4EC9B0",
          brightYellow: "#DCAA5F",
          brightBlue: "#007ACC",
          brightMagenta: "#C586C0",
          brightCyan: "#4FC1FF",
          brightWhite: "#FFFFFF",
        },
        fontFamily: "'Monaco', 'Menlo', 'Consolas', monospace",
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: true,
        convertEol: true,
        scrollback: 5000,
      });

      const fitAddon = new FitAddon();
      xterm.loadAddon(fitAddon);

      return { id, name: termName, terminal: xterm, fitAddon, containerEl: null, socket: undefined };
    },
    []
  );

  const attachTerminal = useCallback(
    (instance: TerminalInstance, el: HTMLDivElement) => {
      if (instance.containerEl === el) return;
      instance.containerEl = el;
      instance.terminal.open(el);

      setTimeout(() => {
        try { instance.fitAddon.fit(); } catch {}
      }, 50);

      instance.terminal.writeln("\x1b[1;34m Welcome to Zicon-IDE Terminal \x1b[0m");
      instance.terminal.writeln("");

      if (webContainerAvailable) {
        const socket = io("http://localhost:5000");
        instance.socket = socket;

        socket.on("connect", () => {
          instance.terminal.writeln("\r\n🚀 Connected to ZiCON Cloud Container\r\n");
          instance.terminal.write("\x1b[1;32m❯\x1b[0m "); // show prompt
        });

        socket.on("terminal-ready", (msg: string) => instance.terminal.writeln(msg));
        socket.on("output", (data: string) => instance.terminal.write(data));
        socket.on("disconnect", () => instance.terminal.writeln("\r\n❌ Disconnected from server\r\n"));

        // Collect full command lines and send on Enter
        let currentLine = "";
        instance.terminal.onKey(({ key, domEvent }) => {
          const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

          if (domEvent.keyCode === 13) { // Enter
            instance.terminal.writeln("");
            if (currentLine.trim()) {
              socket.emit("command", currentLine); // send full command
            }
            currentLine = "";
            instance.terminal.write("\x1b[1;32m❯\x1b[0m "); // new prompt
          } else if (domEvent.keyCode === 8) { // Backspace
            if (currentLine.length > 0) {
              currentLine = currentLine.slice(0, -1);
              instance.terminal.write("\b \b");
            }
          } else if (printable) {
            currentLine += key;
            instance.terminal.write(key);
          }
        });
      } else {
        instance.terminal.writeln("\x1b[1;33m⚠ WebContainers not available (requires cross-origin isolation)\x1b[0m");
        instance.terminal.writeln("\x1b[90m  Running in simulated terminal mode\x1b[0m");
        instance.terminal.writeln("");
        writePrompt(instance.terminal);
        setupSimulatedShell(instance);
      }

      if (onTerminalReady) onTerminalReady(instance.terminal, instance.id);
    },
    [webContainerAvailable, onTerminalReady]
  );

  const setupSimulatedShell = useCallback(
    (instance: TerminalInstance) => {
      let currentLine = "";
      const commandHistory: string[] = [];
      let historyIndex = -1;

      instance.terminal.onKey(({ key, domEvent }) => {
        const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

        if (domEvent.keyCode === 13) {
          instance.terminal.writeln("");
          if (currentLine.trim()) {
            commandHistory.unshift(currentLine);
            processCommand(instance.terminal, currentLine.trim());
          } else writePrompt(instance.terminal);

          currentLine = "";
          historyIndex = -1;
        } else if (domEvent.keyCode === 8) {
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            instance.terminal.write("\b \b");
          }
        } else if (domEvent.keyCode === 38) {
          if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            while (currentLine.length > 0) {
              instance.terminal.write("\b \b");
              currentLine = currentLine.slice(0, -1);
            }
            currentLine = commandHistory[historyIndex];
            instance.terminal.write(currentLine);
          }
        } else if (domEvent.keyCode === 40) {
          while (currentLine.length > 0) {
            instance.terminal.write("\b \b");
            currentLine = currentLine.slice(0, -1);
          }
          if (historyIndex > 0) {
            historyIndex--;
            currentLine = commandHistory[historyIndex];
            instance.terminal.write(currentLine);
          } else historyIndex = -1;
        } else if (printable) {
          currentLine += key;
          instance.terminal.write(key);
        }
      });

      if (onTerminalInput) {
        instance.terminal.onData((data) => {
          onTerminalInput(data, instance.id);
        });
      }
    },
    [onTerminalInput]
  );

  const processCommand = (terminal: XTerminal, cmd: string) => {
    const parts = cmd.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
      case "help":
        terminal.writeln("\x1b[1;36mAvailable commands:\x1b[0m");
        terminal.writeln("  help          - Show this help message");
        terminal.writeln("  clear         - Clear the terminal");
        terminal.writeln("  echo [text]   - Print text");
        terminal.writeln("  ls            - List files");
        terminal.writeln("  pwd           - Print working directory");
        terminal.writeln("  date          - Show current date");
        terminal.writeln("  whoami        - Show current user");
        terminal.writeln("  cat [file]    - Show file contents");
        terminal.writeln("  node -v       - Show Node.js version");
        terminal.writeln("  npm -v        - Show npm version");
        terminal.writeln("  npm install   - Simulate package installation");
        terminal.writeln("  npm run dev   - Simulate dev server start");
        terminal.writeln("");
        break;
      case "clear":
        terminal.clear();
        break;
      case "echo":
        terminal.writeln(args.join(" "));
        break;
      case "ls":
        terminal.writeln("\x1b[1;34msrc/\x1b[0m  index.html  package.json  vite.config.js");
        break;
      case "pwd":
        terminal.writeln("/home/project");
        break;
      case "date":
        terminal.writeln(new Date().toString());
        break;
      case "whoami":
        terminal.writeln("zicon-user");
        break;
      case "cat":
        if (args[0]) terminal.writeln(`\x1b[90m(simulated) Contents of ${args[0]}...\x1b[0m`);
        else terminal.writeln("\x1b[31mUsage: cat <filename>\x1b[0m");
        break;
      case "node":
        terminal.writeln("v18.18.0");
        break;
      case "npm":
        if (args[0] === "-v" || args[0] === "--version") terminal.writeln("9.8.1");
        else if (args[0] === "install" || args[0] === "i") simulateNpmInstall(terminal);
        else if (args[0] === "run" && args[1] === "dev") simulateDevServer(terminal);
        else terminal.writeln(`npm ${args.join(" ")}`);
        break;
      default:
        terminal.writeln(`\x1b[31mcommand not found: ${command}\x1b[0m`);
        terminal.writeln("\x1b[90mType 'help' for available commands\x1b[0m");
    }
    writePrompt(terminal);
  };

  const simulateNpmInstall = (terminal: XTerminal) => {
    const packages = ["react", "react-dom", "@vitejs/plugin-react", "vite"];
    let i = 0;
    terminal.writeln("");
    const interval = setInterval(() => {
      if (i < packages.length) {
        terminal.writeln(`\x1b[90m  + ${packages[i]}@latest\x1b[0m`);
        i++;
      } else {
        clearInterval(interval);
        terminal.writeln("");
        terminal.writeln(`\x1b[1;32madded ${packages.length} packages in 2.1s\x1b[0m`);
        terminal.writeln("");
        writePrompt(terminal);
      }
    }, 400);
  };

  const simulateDevServer = (terminal: XTerminal) => {
    terminal.writeln("");
    terminal.writeln("\x1b[1;36m  VITE v5.1.0  ready in 320 ms\x1b[0m");
    terminal.writeln("");
    terminal.writeln("  \x1b[1;32m➜\x1b[0m  \x1b[1mLocal:\x1b[0m   http://localhost:5173/");
    terminal.writeln("  \x1b[1;32m➜\x1b[0m  \x1b[90mNetwork: use --host to expose\x1b[0m");
    terminal.writeln("  \x1b[1;32m➜\x1b[0m  \x1b[90mpress h + enter to show help\x1b[0m");
    terminal.writeln("");
  };

  const writePrompt = (terminal: XTerminal) => terminal.write("\x1b[1;32m❯\x1b[0m ");

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    const first = createTerminalInstance("Terminal");
    setTerminals([first]);
    setActiveTerminalId(first.id);
  }, [createTerminalInstance]);

  useEffect(() => {
    for (const t of terminals) {
      const el = containerRefs.current.get(t.id);
      if (el && !t.containerEl) attachTerminal(t, el);
    }
  }, [terminals, activeTerminalId, attachTerminal]);

  useEffect(() => {
    const handleResize = () => {
      for (const t of terminals) {
        try { t.fitAddon.fit(); } catch {}
      }
    };
    window.addEventListener("resize", handleResize);
    const observer = new ResizeObserver(handleResize);
    for (const t of terminals) {
      const el = containerRefs.current.get(t.id);
      if (el) observer.observe(el);
    }
    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [terminals]);

  const addTerminal = () => {
    const newTerm = createTerminalInstance();
    setTerminals((prev) => [...prev, newTerm]);
    setActiveTerminalId(newTerm.id);
  };

  const removeTerminal = (id: string) => {
    const t = terminals.find((t) => t.id === id);
    if (t) {
      if (t.socket) t.socket.disconnect();
      t.terminal.dispose();
    }
    setTerminals((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTerminalId === id && next.length > 0) setActiveTerminalId(next[next.length - 1].id);
      return next;
    });
  };

  return (
    <div className="h-full w-full bg-[#1E1E1E] flex flex-col overflow-hidden">
      <div className="h-[30px] bg-[#252526] border-b border-[#3E3E42] flex items-center px-1 shrink-0">
        <div className="flex items-center flex-1 overflow-x-auto scrollbar-none">
          {terminals.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-1 px-2 h-[28px] cursor-pointer text-xs shrink-0 border-r border-[#3E3E42] ${
                activeTerminalId === t.id ? "bg-[#1E1E1E] text-white" : "text-[#858585] hover:text-[#CCCCCC]"
              }`}
              onClick={() => setActiveTerminalId(t.id)}
            >
              <TerminalIcon className="w-3 h-3" />
              <span>{t.name}</span>
              {terminals.length > 1 && (
                <button
                  className="hover:bg-[#333333] rounded p-0.5 ml-0.5"
                  onClick={(e) => { e.stopPropagation(); removeTerminal(t.id); }}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addTerminal}
          className="hover:bg-[#333333] rounded p-1 ml-1 shrink-0"
          title="New Terminal"
        >
          <Plus className="w-3.5 h-3.5 text-[#858585]" />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {terminals.map((t) => (
          <div
            key={t.id}
            className="absolute inset-0"
            style={{ display: activeTerminalId === t.id ? "block" : "none", padding: "4px 8px" }}
            ref={(el) => { if (el) containerRefs.current.set(t.id, el); }}
          />
        ))}
      </div>
    </div>
  );
}