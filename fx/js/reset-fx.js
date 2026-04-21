window.ResetFX = {
  init() {
    DOM.resetBtn.onclick = () => {
      AppState.modules.forEach(m => {
        if (m.reset) m.reset();
      });
    };
  }
};
