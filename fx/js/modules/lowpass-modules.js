(function () {
  const module = {
    id: 'lowpass',
    node: null,
    els: {},

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';
      card.innerHTML = `
        <h3>
          Low-Pass Filter
          <label class="inline-toggle">
            <input type="checkbox" id="lowpass-enabled" checked />
            On
          </label>
        </h3>
        <div class="controls">
          <div>
            <label for="lowpass-freq">Cutoff Frequency</label>
            <div class="slider-row">
              <input type="range" id="lowpass-freq" min="0" max="100" step="0.1" value="100" />
              <div class="value" id="lowpass-freq-value"></div>
            </div>
          </div>
        </div>
      `;
      return card;
    },

    init() {
      this.node = AppState.audioContext.createBiquadFilter();
      this.node.type = 'lowpass';

      this.els.enabled = document.getElementById('lowpass-enabled');
      this.els.freq = document.getElementById('lowpass-freq');
      this.els.freqValue = document.getElementById('lowpass-freq-value');

      this.els.enabled.addEventListener('input', () => this.update());
      this.els.freq.addEventListener('input', () => this.update());

      this.update();
    },

    connect(inputNode) {
      inputNode.connect(this.node);
      return this.node;
    },

    update() {
      const enabled = this.els.enabled.checked;
      const freq = enabled ? Utils.logSliderToHz(Number(this.els.freq.value)) : 20000;
      this.node.frequency.value = freq;
      this.els.freqValue.textContent = Utils.formatHz(freq);
    },

    reset() {
      this.els.enabled.checked = true;
      this.els.freq.value = 100;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
