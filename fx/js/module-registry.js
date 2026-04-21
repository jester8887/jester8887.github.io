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

    this.enforceExclusiveActivation();
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
  },

  enforceExclusiveActivation() {
    const toggles = DOM.effectsContainer.querySelectorAll('input[type="checkbox"][id$="-enabled"]');

    toggles.forEach(toggle => {
      toggle.addEventListener('change', () => {
        if (!toggle.checked) return;

        toggles.forEach(other => {
          if (other === toggle) return;
          if (!other.checked) return;

          other.checked = false;
          other.dispatchEvent(new Event('input', { bubbles: true }));
          other.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    });
  }
};
