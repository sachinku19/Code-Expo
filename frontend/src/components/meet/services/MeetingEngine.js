import { MediaManager } from "./MediaManager";
import { PeerManager } from "./PeerManager";
import { SignalingService } from "./SignalingService";

/**
 * MeetingEngine - Enterprise multi-party meeting facade orchestrating 
 * DeviceManager, MediaManager, PeerManager, and SignalingService.
 */
export class MeetingEngine {
  constructor(socket, roomId, currentUser, callbacks) {
    this.socket = socket;
    this.roomId = roomId;
    this.currentUser = currentUser;
    this.myId = currentUser?.id || currentUser?._id;
    this.callbacks = callbacks; // onParticipantsChange, onLocalStreamChange, onLocalSpeaking

    this.mediaManager = MediaManager.getInstance();
    this.signalingService = new SignalingService(socket, roomId, this.myId, currentUser);
    this.peerManager = null;

    this.participants = [];
    this.remoteStreams = {};
    this.localStream = null;
    this.isMicOn = true;
    this.isVideoOn = true;
    this.isHandRaised = false;
    this.isScreenSharing = false;
  }

  async start(initialMicOn = true, initialVideoOn = true) {
    this.isMicOn = initialMicOn;
    this.isVideoOn = initialVideoOn;

    // Initialize Local Media Manager callbacks
    this.mediaManager.setCallbacks({
      onStreamChange: (stream) => this.handleLocalStreamChange(stream),
      onVolumeChange: (speaking, volume) => {
        if (this.callbacks.onLocalSpeaking) {
          this.callbacks.onLocalSpeaking(speaking, volume);
        }
      }
    });

    // Acquire camera and mic input streams
    this.localStream = await this.mediaManager.acquireLocalStream(initialVideoOn, initialMicOn);

    // Initialize PeerManager
    this.peerManager = new PeerManager(
      this.socket,
      this.localStream,
      this.myId,
      (remoteSocketId, remoteUserId, stream) => this.handleRemoteTrack(remoteSocketId, remoteUserId, stream),
      (remoteSocketId, candidate) => this.signalingService.sendSignal(remoteSocketId, candidate, "candidate")
    );

    // Bind Signaling event listeners
    this.signalingService.on("update-users", (usersList) => this.handleUpdateUsers(usersList));
    this.signalingService.on("signal", ({ fromSocketId, fromUserId, signalData, signalType }) => {
      if (this.peerManager) {
        this.peerManager.handleSignal(fromSocketId, fromUserId, signalData, signalType);
      }
    });

    this.signalingService.setupListeners();
    this.signalingService.join(initialMicOn, initialVideoOn);
  }

  handleLocalStreamChange(stream) {
    this.localStream = stream;
    if (this.peerManager) {
      this.peerManager.updateLocalStream(stream);
    }
    if (this.callbacks.onLocalStreamChange) {
      this.callbacks.onLocalStreamChange(stream);
    }
  }

  handleRemoteTrack(remoteSocketId, remoteUserId, stream) {
    this.remoteStreams[remoteSocketId] = stream;
    this.remoteStreams[remoteUserId] = stream;

    // Trigger state change re-render
    if (this.callbacks.onParticipantsChange) {
      this.callbacks.onParticipantsChange([...this.participants]);
    }
  }

  handleUpdateUsers(usersList) {
    this.participants = usersList || [];

    // Prune connection maps of members who left the meeting
    const activeSockets = new Set(this.participants.map((p) => p.socketId).filter(Boolean));
    if (this.peerManager) {
      this.peerManager.peers.forEach((peer, socketId) => {
        if (!activeSockets.has(socketId)) {
          console.log(`[MEET_OBSERVER] Peer ${socketId} disconnected. Closing connection and releasing tracks.`);
          this.peerManager.removePeer(socketId);
          delete this.remoteStreams[socketId];
          const p = this.participants.find((x) => x.socketId === socketId);
          if (p) delete this.remoteStreams[p.userId];
        }
      });
    }

    // Proactively initiate WebRTC connection with new peers
    this.participants.forEach((p) => {
      if (p.socketId && p.socketId !== this.socket.id && this.peerManager) {
        this.peerManager.createPeer(p.socketId, p.userId);
      }
    });

    if (this.callbacks.onParticipantsChange) {
      this.callbacks.onParticipantsChange([...this.participants]);
    }
  }

  async toggleCamera() {
    const camState = await this.mediaManager.toggleCamera();
    this.isVideoOn = camState;

    const videoTrack = this.localStream ? this.localStream.getVideoTracks()[0] : null;
    if (this.peerManager) {
      await this.peerManager.replaceLocalTrack("video", videoTrack || null);
    }

    this.signalingService.sendStateChange(this.isMicOn, this.isVideoOn, this.isHandRaised);
    return camState;
  }

  async toggleMic() {
    const micState = await this.mediaManager.toggleMic();
    this.isMicOn = micState;

    // Directly manipulate the active RTCRtpSenders on all peer connections to ensure silence
    if (this.peerManager) {
      this.peerManager.peers.forEach(({ pc }) => {
        pc.getSenders().forEach((sender) => {
          if (sender.track && sender.track.kind === "audio") {
            sender.track.enabled = micState;
          }
        });
      });
    }

    const audioTrack = this.localStream ? this.localStream.getAudioTracks()[0] : null;
    if (this.peerManager) {
      await this.peerManager.replaceLocalTrack("audio", audioTrack || null);
    }

    this.signalingService.sendStateChange(this.isMicOn, this.isVideoOn, this.isHandRaised);
    return micState;
  }

  async toggleHandRaise() {
    this.isHandRaised = !this.isHandRaised;
    this.signalingService.sendStateChange(this.isMicOn, this.isVideoOn, this.isHandRaised);
    return this.isHandRaised;
  }

  async toggleScreenShare() {
    if (this.isScreenSharing) {
      this.mediaManager.stopScreenShare();
      this.isScreenSharing = false;

      // Restore local camera track
      const videoTrack = this.localStream ? this.localStream.getVideoTracks()[0] : null;
      if (this.peerManager) {
        await this.peerManager.replaceLocalTrack("video", videoTrack || null);
      }
    } else {
      try {
        const screenStream = await this.mediaManager.startScreenShare();
        this.isScreenSharing = true;

        const screenTrack = screenStream.getVideoTracks()[0];
        if (this.peerManager) {
          await this.peerManager.replaceLocalTrack("video", screenTrack);
        }

        screenTrack.onended = () => {
          this.toggleScreenShare(); // Restore to webcam upon screen share exit
        };
      } catch (e) {
        this.isScreenSharing = false;
      }
    }
    return this.isScreenSharing;
  }

  destroy() {
    this.signalingService.leave();
    this.signalingService.cleanupListeners();
    if (this.peerManager) {
      this.peerManager.clear();
    }
    this.mediaManager.destroy();
  }
}
