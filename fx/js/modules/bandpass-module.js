(function () {
  const module = {
    id: 'bandpass',
    node: null,
    els: {},

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';
      card.innerHTML = `
        <h3>
          Band-Pass Filter
          <label class="inline-toggle">
            <input type="checkbox" id="bandpass-enabled" />
            On
          </label>
        </h3>
        <div class="controls">
          <div>
            <label for="bandpass-freq">Center Frequency</label>
            <div class="slider-row">
              <input type="range" id="bandpass-freq" min="0" max="100" step="0.1" value="50" />
              <div class="value" id="bandpass-freq-value"></div>
            </div>
          </div>
          <div>
            <label for="bandpass-q">Q Factor</label>
            <div class="slider-row">
              <input type="range" id="bandpass-q" min="0.1" max="30" step="0.1" value="1" />
              <div class="value" id="bandpass-q-value"></div>
            </div>
          </div>
        </div>
      `;
      return card;
    },

    init() {
      this.node = AppState.audioContext.createBiquadFilter();
      this.node.type = 'bandpass';

      this.els.enabled = document.getElementById('bandpass-enabled');
      this.els.freq = document.getElementById('bandpass-freq');
      this.els.freqValue = document.getElementById('bandpass-freq-value');
      this.els.q = document.getElementById('bandpass-q');
      this.els.qValue = document.getElementById('bandpass-q-value');

      this.els.enabled.addEventListener('input', () => this.update());
      this.els.freq.addEventListener('input', () => this.update());
      this.els.q.addEventListener('input', () => this.update());

      this.update();
    },

    connect(inputNode) {
      inputNode.connect(this.node);
      return this.node;
    },

    update() {
      const enabled = this.els.enabled.checked;
      const freq = Utils.logSliderToHz(Number(this.els.freq.value));
      const q = Number(this.els.q.value);

      this.node.type = enabled ? 'bandpass' : 'allpass';
      this.node.frequency.value = freq;
      this.node.Q.value = q;

      this.els.freqValue.textContent = Utils.formatHz(freq);
      this.els.qValue.textContent = q.toFixed(2);
    },

    reset() {
      this.els.enabled.checked = false;
      this.els.freq.value = 50;
      this.els.q.value = 1;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
