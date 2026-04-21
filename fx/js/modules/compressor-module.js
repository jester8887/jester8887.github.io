(function () {
  const module = {
    id: 'compressor',
    node: null,
    els: {},

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';
      card.innerHTML = `
        <h3>
          Compressor
          <label class="inline-toggle">
            <input type="checkbox" id="compressor-enabled" />
            On
          </label>
        </h3>
        <div class="controls">
          <div>
            <label for="compressor-threshold">Threshold</label>
            <div class="slider-row">
              <input type="range" id="compressor-threshold" min="-100" max="0" step="1" value="-24" />
              <div class="value" id="compressor-threshold-value"></div>
            </div>
          </div>
          <div>
            <label for="compressor-ratio">Ratio</label>
            <div class="slider-row">
              <input type="range" id="compressor-ratio" min="1" max="20" step="0.1" value="4" />
              <div class="value" id="compressor-ratio-value"></div>
            </div>
          </div>
          <div>
            <label for="compressor-attack">Attack</label>
            <div class="slider-row">
              <input type="range" id="compressor-attack" min="0" max="1" step="0.001" value="0.003" />
              <div class="value" id="compressor-attack-value"></div>
            </div>
          </div>
          <div>
            <label for="compressor-release">Release</label>
            <div class="slider-row">
              <input type="range" id="compressor-release" min="0" max="1" step="0.001" value="0.25" />
              <div class="value" id="compressor-release-value"></div>
            </div>
          </div>
        </div>
      `;
      return card;
    },

    init() {
      this.node = AppState.audioContext.createDynamicsCompressor();

      this.els.enabled = document.getElementById('compressor-enabled');
      this.els.threshold = document.getElementById('compressor-threshold');
      this.els.thresholdValue = document.getElementById('compressor-threshold-value');
      this.els.ratio = document.getElementById('compressor-ratio');
      this.els.ratioValue = document.getElementById('compressor-ratio-value');
      this.els.attack = document.getElementById('compressor-attack');
      this.els.attackValue = document.getElementById('compressor-attack-value');
      this.els.release = document.getElementById('compressor-release');
      this.els.releaseValue = document.getElementById('compressor-release-value');

      Object.values(this.els).forEach(el => {
        if (el && el.tagName === 'INPUT') el.addEventListener('input', () => this.update());
      });

      this.update();
    },

    connect(inputNode) {
      if (!this.els.enabled.checked) return inputNode;
      inputNode.connect(this.node);
      return this.node;
    },

    update() {
      const threshold = Number(this.els.threshold.value);
      const ratio = Number(this.els.ratio.value);
      const attack = Number(this.els.attack.value);
      const release = Number(this.els.release.value);

      this.node.threshold.value = threshold;
      this.node.ratio.value = ratio;
      this.node.attack.value = attack;
      this.node.release.value = release;

      this.els.thresholdValue.textContent = `${Math.round(threshold)} dB`;
      this.els.ratioValue.textContent = `${ratio.toFixed(1)}:1`;
      this.els.attackValue.textContent = `${attack.toFixed(3)} s`;
      this.els.releaseValue.textContent = `${release.toFixed(3)} s`;
    },

    reset() {
      this.els.enabled.checked = false;
      this.els.threshold.value = -24;
      this.els.ratio.value = 4;
      this.els.attack.value = 0.003;
      this.els.release.value = 0.25;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
