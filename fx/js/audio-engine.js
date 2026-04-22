window.AudioEngine = {

  async init() {
    if (AppState.audioContext) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    AppState.audioContext = new AudioCtx();

    this.masterGain = AppState.audioContext.createGain();
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

const masterModule = ModuleRegistry.modules.find(
  (m) => m.id === 'master'
);

chain.connect(this.masterGain);

if (masterModule && masterModule.input && masterModule.output) {
  this.masterGain.disconnect();
  this.masterGain.connect(masterModule.input);

  try {
    masterModule.output.disconnect();
  } catch (e) {}

  masterModule.output.connect(AppState.audioContext.destination);
} else {
  this.masterGain.connect(AppState.audioContext.destination);
}

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
