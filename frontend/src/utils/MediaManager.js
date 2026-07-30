/**
 * Concurrency Mutex to serialize media capture operations and prevent race conditions.
 */
class Mutex {
  constructor() {
    this.queue = Promise.resolve();
  }

  async lock(callback) {
    let resolve;
    const next = new Promise((r) => {
      resolve = r;
    });
    const current = this.queue;
    this.queue = next;
    try {
      await current;
      return await callback();
    } finally {
      resolve();
    }
  }
}

/**
 * Enterprise Media Manager for Google Meet WebRTC stream synchronization.
 */
export class MediaManager {
  constructor() {
    this.localStream = null;
    this.screenStream = null;
    this.isMicOn = true;
    this.isVideoOn = true;
    this.isScreenSharing = false;
    this.peers = new Map(); // socketId -> RTCPeerConnection
    this.mutex = new Mutex();
    this.onStreamChangeCallback = null;
  }

  setStreamChangeCallback(callback) {
    this.onStreamChangeCallback = callback;
  }

  notifyStreamChange() {
    if (this.onStreamChangeCallback && this.localStream) {
      this.onStreamChangeCallback(new MediaStream(this.localStream.getTracks()));
    }
  }

  registerPeer(socketId, pc) {
    this.peers.set(socketId, pc);
  }

  unregisterPeer(socketId) {
    this.peers.delete(socketId);
  }

  clearPeers() {
    this.peers.clear();
  }

  /**
   * Initializes the initial media stream (audio + optional video).
   */
  async initializeStream(initialMicOn, initialVideoOn) {
    return this.mutex.lock(async () => {
      this.isMicOn = initialMicOn;
      this.isVideoOn = initialVideoOn;

      try {
        // Request both audio and video
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: this.isVideoOn,
          audio: true
        });
      } catch (err) {
        console.warn("MediaManager: Failed getting camera/audio, trying audio only fallback...", err);
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
          });
          this.isVideoOn = false;
        } catch (err2) {
          console.warn("MediaManager: Audio only fallback failed, creating synthetic audio...", err2);
          this.localStream = this.createSyntheticStream();
          this.isMicOn = false;
          this.isVideoOn = false;
        }
      }

      // Configure tracks with initial states
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = this.isMicOn;
      }
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = this.isVideoOn;
      }

      return this.localStream;
    });
  }

  async setMicState(enabled) {
    return this.mutex.lock(async () => {
      if (this.isMicOn === enabled) return;
      this.isMicOn = enabled;
      if (!this.localStream) return;

      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
      }
    });
  }

  /**
   * Toggles the local camera state, stopping the camera hardware when OFF.
   */
  async setVideoState(enabled) {
    return this.mutex.lock(async () => {
      const hasTrack = this.localStream && this.localStream.getVideoTracks().length > 0;
      if (this.isVideoOn === enabled && hasTrack === enabled) return;
      this.isVideoOn = enabled;
      if (!this.localStream) return;

      const videoTrack = this.localStream.getVideoTracks()[0];

      if (!enabled) {
        // Stop hardware camera sensor immediately (turns off physical webcam LED)
        if (videoTrack) {
          videoTrack.enabled = false;
          videoTrack.stop();
          this.localStream.removeTrack(videoTrack);
        }

        // Inform WebRTC PeerConnections to transmit black/empty frames
        await this.syncPeerTrack("video", null);
        this.notifyStreamChange();
      } else {
        // Camera is turning ON -> request fresh hardware video track
        if (!videoTrack || videoTrack.readyState === "ended") {
          try {
            const freshStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const freshTrack = freshStream.getVideoTracks()[0];
            if (freshTrack) {
              // Stop any existing dead track
              if (videoTrack) {
                try {
                  videoTrack.stop();
                } catch (e) { }
                this.localStream.removeTrack(videoTrack);
              }

              freshTrack.enabled = true;
              this.localStream.addTrack(freshTrack);

              // Sync updated track with active PeerConnections
              await this.syncPeerTrack("video", freshTrack);
              this.notifyStreamChange();
            }
          } catch (err) {
            console.error("MediaManager: Re-acquiring video hardware failed:", err);
            this.isVideoOn = false;
          }
        } else {
          videoTrack.enabled = true;
        }
      }
    });
  }

  /**
   * Replaces tracks on active WebRTC PeerConnections.
   */
  async syncPeerTrack(kind, track) {
    const promises = [];
    this.peers.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === kind);
      if (sender) {
        promises.push(sender.replaceTrack(track).catch((e) => {
          console.warn(`MediaManager: Failed replacing ${kind} track on peer connection:`, e);
        }));
      } else if (track) {
        try {
          pc.addTrack(track, this.localStream);
        } catch (e) {
          console.warn(`MediaManager: Failed adding ${kind} track on peer connection:`, e);
        }
      }
    });
    await Promise.all(promises);
  }

  /**
   * Toggles local screen sharing.
   */
  async startScreenShare() {
    return this.mutex.lock(async () => {
      try {
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" },
          audio: false
        });
        this.isScreenSharing = true;

        const screenTrack = this.screenStream.getVideoTracks()[0];
        if (screenTrack) {
          await this.syncPeerTrack("video", screenTrack);
        }
        return this.screenStream;
      } catch (err) {
        console.warn("MediaManager: Screen sharing start failed:", err);
        this.isScreenSharing = false;
        throw err;
      }
    });
  }

  async stopScreenShare() {
    return this.mutex.lock(async () => {
      if (this.screenStream) {
        this.screenStream.getTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
        });
        this.screenStream = null;
      }
      this.isScreenSharing = false;

      // Revert WebRTC peer connections back to camera stream if camera is on
      const cameraTrack = this.localStream?.getVideoTracks()[0];
      await this.syncPeerTrack("video", cameraTrack || null);
    });
  }

  /**
   * Release all media tracks, hardware hooks, and peer connections immediately.
   */
  destroy() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          track.enabled = false;
          track.stop();
        } catch (e) { }
      });
      this.localStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => {
        try {
          track.enabled = false;
          track.stop();
        } catch (e) { }
      });
      this.screenStream = null;
    }

    this.peers.forEach((pc) => {
      try {
        pc.close();
      } catch (e) { }
    });
    this.peers.clear();
  }

  createSyntheticStream() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const dst = ctx.createMediaStreamDestination();
      osc.connect(dst);
      osc.start();
      return dst.stream;
    } catch (e) {
      console.error("MediaManager: Creating synthetic audio stream failed:", e);
      return new MediaStream();
    }
  }
}
