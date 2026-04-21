(function () {
  const module = {
    id: 'master',
    els: {},

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';
      card.innerHTML = `
        <h3>Master Output</h3>
        <div class="controls">
          <div>
            <label for="master-gain">Volume</label>
            <div class="slider-row">
              <input type="range" id="master-gain" min="0" max="1.5" step="0.01" value="1" />
              <div class="value" id="master-gain-value"></div>
            </div>
          </div>
        </div>
      `;
      return card;
    },

    init() {
      this.els.gain = document.getElementById('master-gain');
      this.els.gainValue = document.getElementById('master-gain-value');

      this.els.gain.addEventListener('input', () => this.update());
      this.update();
    },

    connect(inputNode) {
      return inputNode;
    },

    update() {
      const gain = Number(this.els.gain.value);
      AudioEngine.masterGain.gain.value = gain;
      this.els.gainValue.textContent = gain.toFixed(2);
    },

    reset() {
      this.els.gain.value = 1;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
