/**
 * DeviceManager - Enterprise device discovery and permissions service
 */
export class DeviceManager {
  /**
   * Enumerates available input/output hardware devices.
   */
  static async getDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        videoInputs: devices.filter((d) => d.kind === "videoinput"),
        audioInputs: devices.filter((d) => d.kind === "audioinput"),
        audioOutputs: devices.filter((d) => d.kind === "audiooutput")
      };
    } catch (e) {
      console.warn("DeviceManager: Failed to enumerate devices:", e);
      return { videoInputs: [], audioInputs: [], audioOutputs: [] };
    }
  }

  /**
   * Prompts user for camera/mic permissions and stops temporary tracks.
   */
  static async requestPermissions(video = true, audio = true) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (e) {
      console.error("DeviceManager: Permission request failed:", e);
      throw e;
    }
  }
}
