(function () {
  const module = {
    id: 'tremolo',
    input: null,
    gainNode: null,
    output: null,
    osc: null,
    depthNode: null,
    baseNode: null,
    els: {},

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';
      card.innerHTML = `
        <h3>
          Tremolo
          <label class="inline-toggle">
            <input type="checkbox" id="tremolo-enabled" />
            On
          </label>
        </h3>
        <div class="controls">
          <div>
            <label for="tremolo-rate">Rate</label>
            <div class="slider-row">
              <input type="range" id="tremolo-rate" min="0.1" max="20" step="0.1" value="3.2" />
              <div class="value" id="tremolo-rate-value"></div>
            </div>
          </div>
          <div>
            <label for="tremolo-depth">Depth</label>
            <div class="slider-row">
              <input type="range" id="tremolo-depth" min="0" max="1" step="0.01" value="1" />
              <div class="value" id="tremolo-depth-value"></div>
            </div>
          </div>
        </div>
      `;
      return card;
    },

    init() {
      const ctx = AppState.audioContext;

      this.input = ctx.createGain();
      this.gainNode = ctx.createGain();
      this.output = ctx.createGain();

      this.osc = ctx.createOscillator();
      this.depthNode = ctx.createGain();
      this.baseNode = ctx.createConstantSource();

      this.osc.type = 'sine';

      this.osc.connect(this.depthNode);
      this.depthNode.connect(this.gainNode.gain);
      this.baseNode.connect(this.gainNode.gain);

      this.input.connect(this.gainNode);
      this.gainNode.connect(this.output);

      this.osc.start();
      this.baseNode.start();

      this.els.enabled = document.getElementById('tremolo-enabled');
      this.els.rate = document.getElementById('tremolo-rate');
      this.els.rateValue = document.getElementById('tremolo-rate-value');
      this.els.depth = document.getElementById('tremolo-depth');
      this.els.depthValue = document.getElementById('tremolo-depth-value');

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
      const rawDepth = enabled ? Number(this.els.depth.value) : 0;

      // Make the slider feel aggressive early
      const depth = Math.pow(rawDepth, 0.35);

      // At full depth, dip almost to silence
      const minFloor = 0.0;

      // LFO output is -1 to 1
      // We solve for base and amp so gain ranges from minGain to 1
      const minGain = 1 - depth * (1 - minFloor);
      const maxGain = 1;

      const amp = (maxGain - minGain) / 2;
      const base = (maxGain + minGain) / 2;

      this.osc.frequency.setValueAtTime(rate, AppState.audioContext.currentTime);
      this.depthNode.gain.setValueAtTime(amp, AppState.audioContext.currentTime);
      this.baseNode.offset.setValueAtTime(base, AppState.audioContext.currentTime);

      this.els.rateValue.textContent = `${rate.toFixed(1)} Hz`;
      this.els.depthValue.textContent = `${Math.round(rawDepth * 100)}%`;
    },

    reset() {
      this.els.enabled.checked = false;
      this.els.rate.value = 3.2;
      this.els.depth.value = 1;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
