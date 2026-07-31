const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { spawn } = require("child_process");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Updated for Vite
    methods: ["GET", "POST"],
  },
});

// Spawn global persistent Docker shell
const dockerShell = spawn('docker', ['exec', '-i', 'campus_sandbox', 'bash']);

dockerShell.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[Docker stdout]: ${output}`);
  io.emit('terminal-output', output);
});

dockerShell.stderr.on('data', (data) => {
  const output = data.toString();
  console.log(`[Docker stderr]: ${output}`);
  io.emit('terminal-output', output);
});

dockerShell.on('close', (code) => {
  console.log(`Docker shell exited with code ${code}`);
});

io.on("connection", (socket) => {
  console.log(`Nexus Hub: User connected - ${socket.id}`);

  socket.on("join-workspace", () => {
    console.log(`User ${socket.id} joined the workspace`);
  });

  socket.on("tile-moved", (payload) => {
    socket.broadcast.emit("tile-moved", payload);
  });

  socket.on("chat-message", (payload) => {
    socket.broadcast.emit("chat-message", payload);
  });

  socket.on("terminal-command", (data) => {
    // Pipe keystrokes to global Docker shell
    if (dockerShell.stdin.writable) {
      dockerShell.stdin.write(data.command);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Nexus Hub: User disconnected - ${socket.id}`);
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Nexus backend running on port ${PORT}`);
});
