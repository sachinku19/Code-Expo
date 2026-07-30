/**
 * MediaManager - Manages capturing, toggling, VAD monitoring, and screen sharing
 */
export class MediaManager {
  constructor() {
    this.localStream = null;
    this.screenStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.onVolumeChange = null;
    this.onStreamChange = null;
    this.isMicOn = true;
    this.isVideoOn = true;
    this.isScreenSharing = false;
    this.vadInterval = null;
  }

  setCallbacks({ onStreamChange, onVolumeChange }) {
    if (onStreamChange) this.onStreamChange = onStreamChange;
    if (onVolumeChange) this.onVolumeChange = onVolumeChange;
  }

  async acquireLocalStream(video = true, audio = true) {
    this.isMicOn = audio;
    this.isVideoOn = video;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 } } : false,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
    } catch (e) {
      console.warn("MediaManager: getUserMedia failed, fallback to audio only:", e);
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
      } catch (err) {
        console.error("MediaManager: Full capture failure, creating empty stream:", err);
        this.localStream = new MediaStream();
      }
      this.isVideoOn = false;
    }

    this.setupAudioAnalyser();
    if (this.onStreamChange) this.onStreamChange(this.localStream);
    return this.localStream;
  }

  setupAudioAnalyser() {
    this.cleanupAudioAnalyser();
    if (!this.localStream) return;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack || !audioTrack.enabled) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.analyser || !this.isMicOn) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const speaking = average > 12;
        if (this.onVolumeChange) {
          this.onVolumeChange(speaking, Math.round(average));
        }
      };

      this.vadInterval = setInterval(checkVolume, 100);
    } catch (e) {
      console.warn("MediaManager: Failed to initialize audio analyser VAD:", e);
    }
  }

  cleanupAudioAnalyser() {
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
    }
    this.audioContext = null;
    this.analyser = null;
  }

  async toggleCamera() {
    this.isVideoOn = !this.isVideoOn;
    if (!this.localStream) return this.isVideoOn;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (this.isVideoOn) {
      try {
        const freshStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 360 } }
        });
        const freshTrack = freshStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          this.localStream.removeTrack(videoTrack);
        }
        this.localStream.addTrack(freshTrack);
      } catch (e) {
        console.error("MediaManager: Failed to start camera:", e);
        this.isVideoOn = false;
      }
    } else {
      if (videoTrack) {
        videoTrack.enabled = false;
        videoTrack.stop();
        this.localStream.removeTrack(videoTrack);
      }
    }

    if (this.onStreamChange) this.onStreamChange(this.localStream);
    return this.isVideoOn;
  }

  async toggleMic() {
    this.isMicOn = !this.isMicOn;
    if (!this.localStream) return this.isMicOn;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = this.isMicOn;
    }

    if (this.isMicOn) {
      this.setupAudioAnalyser();
    } else {
      this.cleanupAudioAnalyser();
      if (this.onVolumeChange) this.onVolumeChange(false, 0);
    }

    return this.isMicOn;
  }

  async startScreenShare() {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false
      });
      this.isScreenSharing = true;
      return this.screenStream;
    } catch (e) {
      console.error("MediaManager: Failed starting screen share:", e);
      this.isScreenSharing = false;
      throw e;
    }
  }

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    this.isScreenSharing = false;
  }

  destroy() {
    this.cleanupAudioAnalyser();
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    this.stopScreenShare();
  }
}
