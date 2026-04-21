(function () {
  const module = {
    id: 'lowshelf',
    node: null,
    els: {},

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';
      card.innerHTML = `
        <h3>
          Low Shelf EQ
          <label class="inline-toggle">
            <input type="checkbox" id="lowshelf-enabled" />
            On
          </label>
        </h3>
        <div class="controls">
          <div>
            <label for="lowshelf-freq">Frequency</label>
            <div class="slider-row">
              <input type="range" id="lowshelf-freq" min="0" max="100" step="0.1" value="35" />
              <div class="value" id="lowshelf-freq-value"></div>
            </div>
          </div>
          <div>
            <label for="lowshelf-gain">Boost / Attenuate</label>
            <div class="slider-row">
              <input type="range" id="lowshelf-gain" min="-24" max="24" step="0.1" value="0" />
              <div class="value" id="lowshelf-gain-value"></div>
            </div>
          </div>
        </div>
      `;
      return card;
    },

    init() {
      this.node = AppState.audioContext.createBiquadFilter();
      this.node.type = 'lowshelf';

      this.els.enabled = document.getElementById('lowshelf-enabled');
      this.els.freq = document.getElementById('lowshelf-freq');
      this.els.freqValue = document.getElementById('lowshelf-freq-value');
      this.els.gain = document.getElementById('lowshelf-gain');
      this.els.gainValue = document.getElementById('lowshelf-gain-value');

      this.els.enabled.addEventListener('input', () => this.update());
      this.els.freq.addEventListener('input', () => this.update());
      this.els.gain.addEventListener('input', () => this.update());

      this.update();
    },

    connect(inputNode) {
      inputNode.connect(this.node);
      return this.node;
    },

    update() {
      const enabled = this.els.enabled.checked;
      const freq = Utils.logSliderToHz(Number(this.els.freq.value));
      const gain = enabled ? Number(this.els.gain.value) : 0;

      this.node.frequency.value = freq;
      this.node.gain.value = gain;

      this.els.freqValue.textContent = Utils.formatHz(freq);
      this.els.gainValue.textContent = `${gain > 0 ? '+' : ''}${gain.toFixed(1)} dB`;
    },

    reset() {
      this.els.enabled.checked = false;
      this.els.freq.value = 35;
      this.els.gain.value = 0;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
