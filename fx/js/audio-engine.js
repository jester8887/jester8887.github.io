window.AudioEngine = {

  async init() {
    if (AppState.audioContext) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    AppState.audioContext = new AudioCtx();

    this.masterGain = AppState.audioContext.createGain();
    this.masterGain.connect(AppState.audioContext.destination);
  },

  async loadBufferFromArrayBuffer(arrayBuffer) {
    await this.init();

    AppState.audioBuffer =
      await AppState.audioContext.decodeAudioData(arrayBuffer);

    AppState.pauseOffset = 0;
  },

  stop() {
    if (AppState.sourceNode) {
      AppState.sourceNode.stop();
      AppState.sourceNode.disconnect();
      AppState.sourceNode = null;
    }

    AppState.isPlaying = false;
    AppState.pauseOffset = 0;
  },

  play() {
    if (!AppState.audioBuffer) return;

    const ctx = AppState.audioContext;

    const source = ctx.createBufferSource();
    source.buffer = AppState.audioBuffer;
    source.loop = AppState.loop;

    let chain = source;
    chain = ModuleRegistry.connectGraph(chain);
    chain.connect(this.masterGain);

    source.start(0, AppState.pauseOffset);

    AppState.startTime = ctx.currentTime - AppState.pauseOffset;
    AppState.sourceNode = source;
    AppState.isPlaying = true;

    source.onended = () => {
      if (!AppState.loop) {
        AppState.isPlaying = false;
        AppState.pauseOffset = 0;
      }
    };
  },

  pause() {
    if (!AppState.isPlaying) return;

    const ctx = AppState.audioContext;

    AppState.pauseOffset = ctx.currentTime - AppState.startTime;

    this.stop();
  }
};
