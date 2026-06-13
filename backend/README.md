
## -----STRUCTURE OF BACKEND----- ##
   backend/
│
├── src/
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── roomController.js
│   │   └── userController.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── errorMiddleware.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Room.js
│   │   └── Message.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── roomRoutes.js
│   │   └── userRoutes.js
│   │
│   ├── sockets/
│   │   └── socketHandler.js
│   │
│   ├── utils/
│   │   └── generateToken.js
│   │
│   ├── app.js
│   └── server.js 
│
├── .env
├── package.json
└── README.md

## ------BACKEND DEPENDENCIES INSTALLATION CAMMAND----- ##
  npm init -y
  npm install express mongoose dotenv cors bcryptjs jsonwebtoken socket.io
  npm install --save-dev nodemon

## ------ SOCKET.IO ---- ##
app.js and server.js separate for socket.io

## ----- Socket.io Room Itegration --+ ##
Implemented Socket.IO server setup for realtime communication.  
Next step is room-based socket architecture where users join specific collaborative rooms.  
This enables isolated realtime events like live code sync, chat, and online participants.  
Socket rooms ensure updates are shared only with users inside the same coding session.  
This forms the core foundation for collaborative realtime coding features.

# ------ Socket.IO Realtime Flow

User connects to Socket.IO server and receives a unique socket connection ID.  
Frontend emits `join-room` event so backend adds the user into a specific realtime room.  
When a user changes code, backend broadcasts updates only to users inside the same room using `socket.to(roomId).emit()`.  
Code persistence is handled separately through `save-code` events which update MongoDB without affecting realtime performance.  
Presence system tracks `user-joined` and `user-left` events to maintain active collaborators in realtime.

## ---- Realtime Chat System

- Implement realtime room-based chat using Socket.IO events.  
- Users inside the same collaborative room can send and receive instant messages.  
- Chat messages are broadcast only to participants of the specific room.  
- MongoDB message persistence will store chat history for reload and reconnect recovery.  
- This completes the collaborative communication layer of the coding platform.

## -----For COMPILER SETUP---- ##
## Compiler / Code Execution System

- Integrate a secure code execution engine to run collaborative code in realtime coding rooms.  
- Backend will receive source code and programming language through REST API requests.  
- Judge0 API will be used for multi-language compilation and execution support.  
- Execution results including output, errors, and status will be returned to the collaborative editor.  
- This phase transforms the platform from a collaborative editor into a complete online coding environment.
 

 ## -----------Local Compiler Execution System
- Implemented backend-based local code execution using Node.js `child_process`.  
- Source code is dynamically written into temporary files before execution.  
- JavaScript programs are executed locally through the Node runtime environment.  
- Compiler captures both successful output (`stdout`) and runtime errors (`stderr`).  
- Nodemon temp-file restart conflicts were resolved by ignoring generated compiler files professionally.

## -----------------##------------- ## --------- ## ---------------- ####-------------#######------#######

# CODE EXPO

A real-time collaborative coding platform where multiple users can join coding rooms, write code together, chat, execute programs, and collaborate in real time.

---

# Tech Stack

## Frontend

* React.js
* React Router DOM
* Axios
* Socket.IO Client
* Monaco Editor

## Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* Socket.IO
* JWT Authentication

---

# Features Completed

## Authentication System

### Register User

* Create new account
* Password hashing using bcrypt
* JWT token generation

### Login User

* Secure authentication
* JWT based authorization
* Store token in localStorage

### Profile

* Fetch logged-in user details
* Protected routes

---

# Room Management

## Create Room

* Create coding room
* Generate unique Room ID
* Select programming language
* Room owner assigned automatically

## Join Room

* Join room using Room ID
* Participants added automatically

## Fetch Room Details

* Room information
* Owner information
* Participant information

## Leave Room

* Remove participant from room
* Realtime participant update

## Delete Room

* Only owner can delete room
* All users redirected automatically

---

# Realtime Collaboration

## Socket.IO Integration

### Join Room Event

* Users join socket room
* Presence tracking

### User Joined Event

* Notify participants when user joins

### User Left Event

* Notify participants when user leaves

### Online Participants List

* Live participant updates

---

# Monaco Editor

## Features

* Real code editor
* Syntax highlighting
* Language support
* Connected with room data

---

# Realtime Code Synchronization

### Code Change Event

* User types code
* Changes sent through socket

### Receive Code Event

* Other users receive updates instantly

---

# Auto Save

### Save Code

* Code saved automatically every few seconds
* Stored in MongoDB

### Load Saved Code

* Restored when room reopens

---

# Realtime Chat

### Send Message

* Messages sent using sockets

### Receive Message

* Instant message delivery

### Chat History

* Stored in MongoDB
* Reloaded on refresh

---

# Compiler

## JavaScript Execution

### Features

* Execute JavaScript code
* Show output
* Show runtime errors
* Show syntax errors

### Output Console

* Display execution results
* Error handling

---

# Database Models

## User

* Username
* Email
* Password
* Role
* Avatar

## Room

* Room ID
* Title
* Language
* Owner
* Participants
* Code
* Private Status

## Message

* Room ID
* Sender
* Username
* Message

---

# Socket Events

## Client → Server

* join-room
* leave-room
* code-change
* save-code
* send-message
* room-deleted

## Server → Client

* user-joined
* user-left
* room-users
* receive-code
* Receive-Message
* room-deleted

---

# API Endpoints

## Authentication

POST /api/auth/register

POST /api/auth/login

GET /api/auth/profile

---

## Rooms

POST /api/rooms/create

POST /api/rooms/join

GET /api/rooms/

DELETE /api/rooms/leave/

DELETE /api/rooms/delete/

---

## Messages

GET /api/messages/

---

## Compiler

POST /api/compiler/run

---

# Project Status

Current MVP Completed:

✅ Authentication

✅ Room Management

✅ Realtime Collaboration

✅ Realtime Chat

✅ Auto Save

✅ Code Execution

✅ Presence System

---

# Next Features Roadmap

## Phase 1

### Multiple Language Support

* Python
* C++
* Java

---

### Private Rooms

* Password protected rooms

---

### Execution History

Store:

* Code
* Output
* User
* Timestamp

---

## Phase 2

### Version History

* Save code snapshots
* Restore previous versions

---

### Kick User

* Room owner can remove users

---

### Shared Output

* Run code once
* Output visible to all users

---

## Phase 3

### Cursor Presence

* Live cursor tracking
* Google Docs style collaboration

---

### Professional UI

* Dashboard redesign
* Sidebar layout
* Responsive design
* Dark theme

---

### Deployment

* Backend deployment
* Frontend deployment
* Production environment setup

---

# Author

Sachin Kumar

B.Tech CSE

CODE EXPO - Real Time Collaborative Coding Platform
