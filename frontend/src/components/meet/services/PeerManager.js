/**
 * PeerManager - W3C Perfect Negotiation WebRTC peer connection manager
 */
export class PeerManager {
  constructor(socket, localStream, myId, onTrackCallback, onIceCandidateCallback) {
    this.socket = socket;
    this.localStream = localStream;
    this.myId = myId;
    this.peers = new Map(); // socketId -> { pc, polite, makingOffer, ignoreOffer, isSettingRemoteAnswerPending, pendingCandidates }
    this.onTrackCallback = onTrackCallback;
    this.onIceCandidateCallback = onIceCandidateCallback;
  }

  updateLocalStream(newStream) {
    this.localStream = newStream;
  }

  createPeer(targetSocketId, targetUserId) {
    if (this.peers.has(targetSocketId)) return this.peers.get(targetSocketId).pc;

    // Polite peer: socket with lexicographically smaller ID is polite
    const polite = this.socket.id < targetSocketId;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    const peerInfo = {
      pc,
      polite,
      makingOffer: false,
      ignoreOffer: false,
      isSettingRemoteAnswerPending: false,
      pendingCandidates: []
    };
    this.peers.set(targetSocketId, peerInfo);

    // Logs connection transition
    pc.onconnectionstatechange = () => {
      console.log(`[MEET_OBSERVER][${new Date().toISOString()}] PeerConnection connectionState: ${pc.connectionState} (Remote Socket: ${targetSocketId})`);
      if (pc.connectionState === "failed") {
        this.restartIce(targetSocketId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[MEET_OBSERVER][${new Date().toISOString()}] ICE Connection state: ${pc.iceConnectionState} (Remote Socket: ${targetSocketId})`);
    };

    pc.onsignalingstatechange = () => {
      console.log(`[MEET_OBSERVER][${new Date().toISOString()}] SignalingState changed: ${pc.signalingState} (Remote Socket: ${targetSocketId})`);
    };

    pc.onicegatheringstatechange = () => {
      console.log(`[MEET_OBSERVER][${new Date().toISOString()}] ICE GatheringState changed: ${pc.iceGatheringState} (Remote Socket: ${targetSocketId})`);
    };

    // Pre-allocate audio & video transceivers to guarantee camera toggle directions
    const audioTrack = this.localStream.getAudioTracks()[0];
    const videoTrack = this.localStream.getVideoTracks()[0];

    if (audioTrack) {
      console.log(`[MEET_OBSERVER][${new Date().toISOString()}] Adding local audio track to Socket: ${targetSocketId}`);
      pc.addTrack(audioTrack, this.localStream);
    } else {
      console.log(`[MEET_OBSERVER][${new Date().toISOString()}] Pre-allocating audio transceiver for Socket: ${targetSocketId}`);
      pc.addTransceiver("audio", { direction: "sendrecv" });
    }

    if (videoTrack) {
      console.log(`[MEET_OBSERVER][${new Date().toISOString()}] Adding local video track to Socket: ${targetSocketId}`);
      pc.addTrack(videoTrack, this.localStream);
    } else {
      console.log(`[MEET_OBSERVER][${new Date().toISOString()}] Pre-allocating video transceiver for Socket: ${targetSocketId}`);
      pc.addTransceiver("video", { direction: "sendrecv" });
    }

    // Bind incoming track events
    pc.ontrack = (event) => {
      console.log(`[MEET_OBSERVER][${new Date().toISOString()}] Received remote track: ${event.track.kind} from Socket: ${targetSocketId}`);
      const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
      
      if (stream.getTracks().indexOf(event.track) === -1) {
        stream.addTrack(event.track);
      }

      const updateUI = () => {
        if (this.onTrackCallback) {
          this.onTrackCallback(targetSocketId, targetUserId, stream);
        }
      };

      event.track.onunmute = () => {
        console.log(`[MEET_OBSERVER][${new Date().toISOString()}] Remote track ${event.track.kind} unmuted from Socket: ${targetSocketId}`);
        updateUI();
      };
      event.track.onmute = () => {
        console.log(`[MEET_OBSERVER][${new Date().toISOString()}] Remote track ${event.track.kind} muted from Socket: ${targetSocketId}`);
        updateUI();
      };
      event.track.onended = () => {
        console.log(`[MEET_OBSERVER][${new Date().toISOString()}] Remote track ${event.track.kind} ended from Socket: ${targetSocketId}`);
        updateUI();
      };

      updateUI();
    };

    // ICE Candidate Generation
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        if (this.onIceCandidateCallback) {
          this.onIceCandidateCallback(targetSocketId, candidate);
        }
      }
    };

    // Perfect Negotiation NegotiationNeeded trigger
    pc.onnegotiationneeded = async () => {
      try {
        peerInfo.makingOffer = true;
        await pc.setLocalDescription();
        this.socket.emit("meet:signal", {
          targetSocketId,
          fromUserId: this.myId,
          signalData: pc.localDescription,
          signalType: "offer"
        });
      } catch (err) {
        console.warn(`PeerManager: NegotiationNeeded error on peer ${targetSocketId}:`, err);
      } finally {
        peerInfo.makingOffer = false;
      }
    };

    return pc;
  }

  async handleSignal(fromSocketId, fromUserId, signalData, signalType) {
    let peerInfo = this.peers.get(fromSocketId);
    if (!peerInfo) {
      this.createPeer(fromSocketId, fromUserId);
      peerInfo = this.peers.get(fromSocketId);
    }

    const { pc, polite } = peerInfo;

    try {
      if (signalType === "offer") {
        const offerCollision = (signalType === "offer") && (peerInfo.makingOffer || pc.signalingState !== "stable");
        peerInfo.ignoreOffer = !polite && offerCollision;

        if (peerInfo.ignoreOffer) {
          console.log(`[MEET_OBSERVER][${new Date().toISOString()}] Offer collision detected. Impolite peer ignoring offer from ${fromSocketId}`);
          return;
        }

        if (offerCollision && polite) {
          console.log(`[MEET_OBSERVER][${new Date().toISOString()}] Offer collision detected. Polite peer rolling back remote offer from ${fromSocketId}`);
          await Promise.all([
            pc.setLocalDescription({ type: "rollback" }),
            pc.setRemoteDescription(new RTCSessionDescription(signalData))
          ]);
        } else {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        }

        // Apply queued candidates
        if (peerInfo.pendingCandidates.length > 0) {
          for (const cand of peerInfo.pendingCandidates) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          peerInfo.pendingCandidates = [];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.socket.emit("meet:signal", {
          targetSocketId: fromSocketId,
          fromUserId: this.myId,
          signalData: answer,
          signalType: "answer"
        });

      } else if (signalType === "answer") {
        peerInfo.isSettingRemoteAnswerPending = true;
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        peerInfo.isSettingRemoteAnswerPending = false;

        if (peerInfo.pendingCandidates.length > 0) {
          for (const cand of peerInfo.pendingCandidates) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          peerInfo.pendingCandidates = [];
        }

      } else if (signalType === "candidate") {
        const readyForCandidate = pc.remoteDescription && pc.remoteDescription.type;
        if (readyForCandidate && !peerInfo.isSettingRemoteAnswerPending) {
          await pc.addIceCandidate(new RTCIceCandidate(signalData)).catch(() => {});
        } else {
          peerInfo.pendingCandidates.push(signalData);
        }
      }
    } catch (err) {
      console.error(`PeerManager: Failed to handle signal ${signalType} from ${fromSocketId}:`, err);
    }
  }

  async replaceLocalTrack(kind, track) {
    const promises = [];
    this.peers.forEach(({ pc }) => {
      const transceiver = pc.getTransceivers().find(
        (t) => (t.receiver && t.receiver.track && t.receiver.track.kind === kind) ||
               (t.sender && t.sender.track && t.sender.track.kind === kind)
      );
      const sender = transceiver ? transceiver.sender : null;
      if (sender) {
        console.log(`[MEET_OBSERVER][${new Date().toISOString()}] replaceLocalTrack: replacing ${kind} track with state: ${track ? "active" : "null"}`);
        promises.push(sender.replaceTrack(track).catch((e) => {
          console.warn(`PeerManager: Failed replacing ${kind} track on peer:`, e);
        }));
      } else {
        console.warn(`PeerManager: No sender found for track kind: ${kind}`);
      }
    });
    await Promise.all(promises);
  }

  restartIce(socketId) {
    const peerInfo = this.peers.get(socketId);
    if (!peerInfo) return;
    try {
      console.log(`[MEET_OBSERVER][${new Date().toISOString()}] ICE Connection failed. Triggering ICE restart for socket ${socketId}`);
      peerInfo.pc.restartIce();
    } catch (e) {
      console.warn(`PeerManager: ICE restart failed for ${socketId}:`, e);
    }
  }

  removePeer(socketId) {
    const peerInfo = this.peers.get(socketId);
    if (peerInfo) {
      try {
        peerInfo.pc.close();
      } catch (e) {}
      this.peers.delete(socketId);
    }
  }

  clear() {
    this.peers.forEach((peer) => {
      try {
        peer.pc.close();
      } catch (e) {}
    });
    this.peers.clear();
  }
}
