// Central registry for effect modules

window.ModuleRegistry = {
  register(module) {
    AppState.modules.push(module);
  },

  initAll() {
    DOM.effectsContainer.innerHTML = "";

    AppState.modules.forEach(module => {
      const el = module.createUI();
      DOM.effectsContainer.appendChild(el);

      if (module.init) {
        module.init();
      }
    });
  },

  connectGraph(inputNode) {
    let current = inputNode;

    AppState.modules.forEach(module => {
      if (module.connect) {
        current = module.connect(current);
      }
    });

    return current;
  },

  updateAll() {
    AppState.modules.forEach(module => {
      if (module.update) module.update();
    });
  }
};
