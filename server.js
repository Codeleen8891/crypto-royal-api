// server.js
const http = require("http");
const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("./config/db");
const { initSocket } = require("./socket");
require("./utils/otpCleanup"); // start OTP cleanup job

const app = require("./app");

// connect DB
connectDB();

// create HTTP server
const server = http.createServer(app);

// init socket.io
initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
