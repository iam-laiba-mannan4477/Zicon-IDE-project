const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const io = require("socket.io")(5000, {
  cors: { origin: "*" }
});

console.log("Backend starting...");

// IMPORTANT: terminal root = workspace folder
const workspaceRoot = path.resolve(__dirname, "../../workspace");

io.on("connection", (socket) => {

  console.log("Client connected:", socket.id);

  socket.emit(
    "terminal-ready",
    "🚀 Connected to ZiCON Cloud Container\n\n❯ Backend terminal ready!\n"
  );

  let cwd = workspaceRoot;

  socket.on("command", (cmd) => {

    cmd = cmd.trim();

    if (!cmd) {
      socket.emit("output", "\x1b[1;32m❯\x1b[0m ");
      return;
    }

    const parts = cmd.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    // CD command
    if (command === "cd") {

      const targetPath = args[0]
        ? path.resolve(cwd, args[0])
        : workspaceRoot;

      // prevent escaping workspace
      if (!targetPath.startsWith(workspaceRoot)) {
        socket.emit(
          "output",
          "Access denied.\n\x1b[1;32m❯\x1b[0m "
        );
        return;
      }

      if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
        cwd = targetPath;
        socket.emit("output", "\x1b[1;32m❯\x1b[0m ");
      } else {
        socket.emit(
          "output",
          `The system cannot find the path specified: ${args[0]}\n\x1b[1;32m❯\x1b[0m `
        );
      }

      return;
    }

    // PWD command
    if (command === "pwd") {
      socket.emit("output", cwd + "\n\x1b[1;32m❯\x1b[0m ");
      return;
    }

    // LS / DIR
    if (command === "ls" || command === "dir") {

      try {

        const files = fs.readdirSync(cwd);

        const list = files.map((f) => {
          const full = path.join(cwd, f);
          return fs.statSync(full).isDirectory() ? f + "/" : f;
        });

        socket.emit(
          "output",
          list.join("  ") + "\n\x1b[1;32m❯\x1b[0m "
        );

      } catch (err) {

        socket.emit(
          "output",
          `Error reading directory: ${err}\n\x1b[1;32m❯\x1b[0m `
        );

      }

      return;
    }

    // run normal commands
    exec(cmd, { cwd }, (err, stdout, stderr) => {

      let output = stdout || stderr || "";

      socket.emit(
        "output",
        output + "\x1b[1;32m❯\x1b[0m "
      );

    });

  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });

});

console.log("Backend running at http://localhost:5000");