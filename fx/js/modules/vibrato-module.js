(function () {
  const module = {
    id: 'vibrato',
    input: null,
    delay: null,
    output: null,
    osc: null,
    depthNode: null,
    els: {},

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';
      card.innerHTML = `
        <h3>
          Vibrato
          <label class="inline-toggle">
            <input type="checkbox" id="vibrato-enabled" />
            On
          </label>
        </h3>
        <div class="controls">
          <div>
            <label for="vibrato-rate">Rate</label>
            <div class="slider-row">
              <input type="range" id="vibrato-rate" min="0.1" max="20" step="0.1" value="5" />
              <div class="value" id="vibrato-rate-value"></div>
            </div>
          </div>
          <div>
            <label for="vibrato-depth">Depth</label>
            <div class="slider-row">
              <input type="range" id="vibrato-depth" min="0" max="1" step="0.01" value="0.2" />
              <div class="value" id="vibrato-depth-value"></div>
            </div>
          </div>
        </div>
      `;
      return card;
    },

    init() {
      const ctx = AppState.audioContext;

      this.input = ctx.createGain();
      this.delay = ctx.createDelay(0.05);
      this.output = ctx.createGain();

      this.osc = ctx.createOscillator();
      this.depthNode = ctx.createGain();

      this.osc.type = 'sine';
      this.osc.connect(this.depthNode);
      this.depthNode.connect(this.delay.delayTime);

      this.input.connect(this.delay);
      this.delay.connect(this.output);

      this.osc.start();

      this.els.enabled = document.getElementById('vibrato-enabled');
      this.els.rate = document.getElementById('vibrato-rate');
      this.els.rateValue = document.getElementById('vibrato-rate-value');
      this.els.depth = document.getElementById('vibrato-depth');
      this.els.depthValue = document.getElementById('vibrato-depth-value');

      this.els.enabled.addEventListener('input', () => this.update());
      this.els.rate.addEventListener('input', () => this.update());
      this.els.depth.addEventListener('input', () => this.update());

      this.update();
    },

    connect(inputNode) {
      inputNode.connect(this.input);
      return this.output;
    },

    update() {
      const enabled = this.els.enabled.checked;
      const rate = enabled ? Number(this.els.rate.value) : 0.1;
      const depth = enabled ? Number(this.els.depth.value) : 0;

      this.osc.frequency.value = rate;
      this.delay.delayTime.value = enabled ? 0.008 : 0.0;
      this.depthNode.gain.value = enabled ? depth * 0.006 : 0;

      this.els.rateValue.textContent = `${rate.toFixed(1)} Hz`;
      this.els.depthValue.textContent = `${Math.round(depth * 100)}%`;
    },

    reset() {
      this.els.enabled.checked = false;
      this.els.rate.value = 5;
      this.els.depth.value = 0.2;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
