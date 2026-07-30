/**
 * SignalingService - Handles idempotent event transmission and socket listeners
 */
export class SignalingService {
  constructor(socket, roomId, myId, userDetails) {
    this.socket = socket;
    this.roomId = roomId;
    this.myId = myId;
    this.userDetails = userDetails;
    this.listeners = new Map();
    this.cleanupFn = null;
  }

  on(event, handler) {
    this.listeners.set(event, handler);
  }

  join(micOn, videoOn) {
    this.socket.emit("meet:join", {
      roomId: this.roomId,
      userId: this.myId,
      username: this.userDetails.username,
      avatar: this.userDetails.avatar,
      isMicOn: micOn,
      isVideoOn: videoOn
    });
  }

  leave() {
    this.socket.emit("meet:leave", {
      roomId: this.roomId,
      userId: this.myId
    });
  }

  sendSignal(targetSocketId, signalData, signalType) {
    this.socket.emit("meet:signal", {
      targetSocketId,
      fromUserId: this.myId,
      signalData,
      signalType
    });
  }

  sendStateChange(isMicOn, isVideoOn, isHandRaised) {
    this.socket.emit("meet:state-change", {
      roomId: this.roomId,
      userId: this.myId,
      isMicOn,
      isVideoOn,
      isHandRaised
    });
  }

  setupListeners() {
    this.cleanupListeners();

    const handleUpdateUsers = (usersList) => {
      const handler = this.listeners.get("update-users");
      if (handler) handler(usersList || []);
    };

    const handleSignal = (data) => {
      const handler = this.listeners.get("signal");
      if (handler) handler(data);
    };

    this.socket.on("meet:update-users", handleUpdateUsers);
    this.socket.on("meet:signal", handleSignal);

    this.cleanupFn = () => {
      this.socket.off("meet:update-users", handleUpdateUsers);
      this.socket.off("meet:signal", handleSignal);
    };
  }

  cleanupListeners() {
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }
  }
}
