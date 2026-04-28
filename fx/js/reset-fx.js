window.ResetFX = {
  init() {
    DOM.resetBtn.onclick = () => {
      AppState.modules.forEach(module => {
        if (module.reset) module.reset();
      });

      if (window.ModuleRegistry?.clearAllEffects) {
        ModuleRegistry.clearAllEffects();
      } else if (window.ModuleRegistry?.updateAll) {
        ModuleRegistry.updateAll();
      }
    };
  }
};
