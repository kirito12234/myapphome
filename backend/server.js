const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const connectDB = require("./src/config/db");
const app = require("./src/app");
const { initSocket } = require("./src/services/socket.service");

const DESIRED_PORT = Number(process.env.PORT) || 5000;
const MAX_RETRIES = 10;

const startServer = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);
    initSocket(server);

    let port = DESIRED_PORT;
    let retries = 0;

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE" && retries < MAX_RETRIES) {
        retries++;
        console.log(`Port ${port} in use, trying ${port + 1}...`);
        port++;
        server.listen(port);
      } else {
        console.error(err.message);
        process.exit(1);
      }
    });

    server.on("listening", () => {
      console.log(`\n  Server running on port ${port}`);
      console.log(`  API Health: http://localhost:${port}/api/health\n`);
    });

    server.listen(port);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

startServer();
