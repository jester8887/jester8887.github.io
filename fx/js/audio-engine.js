window.AudioEngine = {
  async init() {
    if (AppState.audioContext) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    AppState.audioContext = new AudioCtx();

    this.masterGain = AppState.audioContext.createGain();
  },

  async loadBufferFromArrayBuffer(arrayBuffer) {
    await this.init();

    // Kill any currently playing source before switching files
    this.stop();

    AppState.audioBuffer =
      await AppState.audioContext.decodeAudioData(arrayBuffer.slice(0));

    AppState.pauseOffset = 0;
  },

  stop() {
    if (AppState.sourceNode) {
      try {
        AppState.sourceNode.onended = null;
        AppState.sourceNode.stop();
      } catch (e) {}

      try {
        AppState.sourceNode.disconnect();
      } catch (e) {}

      AppState.sourceNode = null;
    }

    AppState.isPlaying = false;
    AppState.pauseOffset = 0;
  },

  play() {
    if (!AppState.audioBuffer) return;

    const ctx = AppState.audioContext;

    // Prevent accidental double-play stacking
    if (AppState.sourceNode) {
      this.stop();
    }

    const source = ctx.createBufferSource();
    source.buffer = AppState.audioBuffer;
    source.loop = AppState.loop;

    let chain = source;
    chain = ModuleRegistry.connectGraph(chain);

    const masterModule = AppState.modules.find(
      (m) => m.id === 'master'
    );

    if (masterModule && masterModule.input && masterModule.output) {
      chain.connect(masterModule.input);

      try {
        masterModule.output.disconnect();
      } catch (e) {}

      masterModule.output.connect(AppState.audioContext.destination);
    } else {
      chain.connect(this.masterGain);

      try {
        this.masterGain.disconnect();
      } catch (e) {}

      this.masterGain.connect(AppState.audioContext.destination);
    }

    source.start(0, AppState.pauseOffset);

    AppState.startTime = ctx.currentTime - AppState.pauseOffset;
    AppState.sourceNode = source;
    AppState.isPlaying = true;

    source.onended = () => {
      if (AppState.sourceNode === source && !AppState.loop) {
        AppState.isPlaying = false;
        AppState.pauseOffset = 0;
        AppState.sourceNode = null;
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
