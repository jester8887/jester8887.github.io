window.AppState = {
  audioContext: null,
  audioBuffer: null,
  sourceNode: null,
  startTime: 0,
  pauseOffset: 0,
  isPlaying: false,
  loop: false,
  selectedItem: null,

  library: [],

  uploadedItem: null,
  uploadedArrayBuffer: null,

  fx: {},

  modules: []
};
