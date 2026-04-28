window.ModuleRegistry = {
  register(module) {
    AppState.modules.push(module);
  },

  initAll() {
    DOM.effectsContainer.innerHTML = "";

    if (DOM.masterOutputHost) {
      DOM.masterOutputHost.innerHTML = "";
    }

    AppState.modules.forEach(module => {
      const el = module.createUI();

      if (module.id === 'master' && DOM.masterOutputHost) {
        DOM.masterOutputHost.appendChild(el);
      } else {
        DOM.effectsContainer.appendChild(el);
      }

      if (module.init) {
        module.init();
      }
    });

    this.bindExclusiveActivation();
    this.syncAllModulesFromUI();
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
    AppState.modules.forEach(module => this.refreshModule(module));
  },

  getEffectToggles() {
    return Array.from(
      DOM.effectsContainer.querySelectorAll('input[type="checkbox"][id$="-enabled"]')
    );
  },

  getModuleForToggle(toggle) {
    if (!toggle || !toggle.id) return null;

    const moduleId = toggle.id.replace(/-enabled$/, '');
    return AppState.modules.find(module => module.id === moduleId) || null;
  },

  syncModuleFromToggle(toggle) {
    const module = this.getModuleForToggle(toggle);
    if (!module) return;

    // Backward compatibility for older modules. Newer modules should read the
    // checkbox directly, but this prevents stale internal state from keeping an
    // effect active after the visual checkbox was cleared.
    if ('enabled' in module) {
      module.enabled = Boolean(toggle.checked);
    }

    this.refreshModule(module);
  },

  refreshModule(module) {
    if (!module) return;

    if (typeof module.update === 'function') {
      module.update();
      return;
    }

    if (typeof module.updateBypass === 'function') {
      module.updateBypass();
    }
  },

  syncAllModulesFromUI() {
    this.getEffectToggles().forEach(toggle => this.syncModuleFromToggle(toggle));
  },

  setOnlyActive(activeToggle) {
    this.getEffectToggles().forEach(toggle => {
      const shouldBeChecked = toggle === activeToggle;

      if (toggle.checked !== shouldBeChecked) {
        toggle.checked = shouldBeChecked;
      }

      this.syncModuleFromToggle(toggle);
    });
  },

  clearAllEffects() {
    this.getEffectToggles().forEach(toggle => {
      toggle.checked = false;
      this.syncModuleFromToggle(toggle);
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

      if (target.checked) {
        this.setOnlyActive(target);
      } else {
        this.syncModuleFromToggle(target);
      }
    });
  }
};
