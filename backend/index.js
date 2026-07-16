
const connectDB = require("./config/db");
require("dotenv").config();



// make app
const app = require("./app");

//Database connection
connectDB();



//--- for socket.io  ---//-----////-----////-----////--//
const http = require("http");
const { Server } = require("socket.io");
const socketHandler = require("./sockets/socketHandler");



// create http server
const server = http.createServer(app);

//initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.set("io", io);

//socket modeul
socketHandler(io);

// planner socket module namespace
const plannerSocket = require("./sockets/plannerSocket");
plannerSocket(io);
//--//--//--//--//-----//////-------////////-------////


// Envoirment Variables
const PORT = process.env.PORT || 5000;

// Server
server.listen(PORT, () => console.log(`server started on http://localhost:${PORT}`));