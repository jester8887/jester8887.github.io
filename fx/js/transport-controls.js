window.Transport = {

  init() {
    DOM.playBtn.onclick = async () => {
      await AudioEngine.init();
      AudioEngine.play();
      Utils.setStatus("Playing");
    };

    DOM.pauseBtn.onclick = () => {
      AudioEngine.pause();
      Utils.setStatus("Paused");
    };

    DOM.stopBtn.onclick = () => {
      AudioEngine.stop();
      Utils.setStatus("Stopped");
    };

    DOM.loopToggle.onchange = (e) => {
      AppState.loop = e.target.checked;
    };
  }
};
