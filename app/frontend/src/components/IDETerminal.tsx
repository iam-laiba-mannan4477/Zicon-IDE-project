import React, { useEffect, useRef, useState } from "react";
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "xterm";
import Split from "react-split";
import "xterm/css/xterm.css";

const IDETerminal = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const wcRef = useRef<WebContainer | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const inputWriter = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const bootTerminal = async () => {
      const wc = await WebContainer.boot();
      wcRef.current = wc;

      // mount starter files
      await wc.mount({
        "index.js": { file: { contents: 'console.log("🚀 Zicon IDE Terminal Ready!");' } }
      });

      // setup terminal
      const term = new Terminal({
        fontSize: 14,
        cursorBlink: true,
        theme: { background: "#0d1117", foreground: "#c9d1d9" },
        scrollback: 1000,
      });

      term.open(terminalRef.current!);
      termRef.current = term;

      const shell = await wc.spawn("sh");
      shell.output.pipeTo(new WritableStream({
        write(data) { term.write(data); }
      }));

      inputWriter.current = shell.input.getWriter();
      term.onData((data) => inputWriter.current.write(data));

      term.write("\n$ Ready! Type 'node index.js' to run\n");
      setReady(true);
    };

    bootTerminal();

    return () => {
      inputWriter.current?.close();
      termRef.current?.dispose();
    };
  }, []);

  const runCode = async () => {
    if (!wcRef.current || !termRef.current) return;

    await wcRef.current.fs.writeFile("/index.js", 'console.log("🚀 Zicon IDE Terminal Running!");');

    const proc = await wcRef.current.spawn("node", ["index.js"]);
    proc.output.pipeTo(new WritableStream({
      write(data) { termRef.current!.write(data); }
    }));

    await proc.exit;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center bg-[#161b22] px-2 py-1 border-b border-[#30363d] text-xs text-[#c9d1d9]">
        <span>Terminal {ready ? "●" : "Loading..."}</span>
        <button
          onClick={runCode}
          disabled={!ready}
          className="bg-[#21262d] px-2 py-1 text-xs rounded hover:bg-[#30363d]"
        >
          Run
        </button>
      </div>
      <div ref={terminalRef} className="flex-1 h-full p-2" />
    </div>
  );
};

export default IDETerminal;
