(function () {
  const module = {
    id: 'highpass',
    node: null,
    els: {},

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';
      card.innerHTML = `
        <h3>
          High-Pass Filter
          <label class="inline-toggle">
            <input type="checkbox" id="highpass-enabled" />
            On
          </label>
        </h3>
        <div class="controls">
          <div>
            <label for="highpass-freq">Cutoff Frequency</label>
            <div class="slider-row">
              <input type="range" id="highpass-freq" min="0" max="100" step="0.1" value="0" />
              <div class="value" id="highpass-freq-value"></div>
            </div>
          </div>
        </div>
      `;
      return card;
    },

    init() {
      this.node = AppState.audioContext.createBiquadFilter();
      this.node.type = 'highpass';

      this.els.enabled = document.getElementById('highpass-enabled');
      this.els.freq = document.getElementById('highpass-freq');
      this.els.freqValue = document.getElementById('highpass-freq-value');

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
      const freq = enabled ? Utils.logSliderToHz(Number(this.els.freq.value)) : 20;
      this.node.frequency.value = freq;
      this.els.freqValue.textContent = Utils.formatHz(freq);
    },

    reset() {
      this.els.enabled.checked = false;
      this.els.freq.value = 0;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
