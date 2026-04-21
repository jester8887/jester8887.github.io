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

    this.bindExclusiveActivation();
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
      if (module.update) {
        module.update();
      }
    });
  },

  bindExclusiveActivation() {
    if (this._exclusiveBound) return;
    this._exclusiveBound = true;

    DOM.effectsContainer.addEventListener('change', (event) => {
      const target = event.target;

      if (
        !target ||
        target.type !== 'checkbox' ||
        !target.id ||
        !target.id.endsWith('-enabled')
      ) {
        return;
      }

      if (!target.checked) return;

      const toggles = DOM.effectsContainer.querySelectorAll(
        'input[type="checkbox"][id$="-enabled"]'
      );

      toggles.forEach(other => {
        if (other === target) return;
        if (!other.checked) return;

        other.checked = false;
        other.dispatchEvent(new Event('input', { bubbles: true }));
      });

      target.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
};
