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
              <input type="range" id="tremolo-rate" min="0.1" max="20" step="0.1" value="5" />
              <div class="value" id="tremolo-rate-value"></div>
            </div>
          </div>
          <div>
            <label for="tremolo-depth">Depth</label>
            <div class="slider-row">
              <input type="range" id="tremolo-depth" min="0" max="1" step="0.01" value="0.5" />
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

  const depth = Math.min(1, rawDepth * 4);

  this.osc.frequency.value = rate;
  this.depthNode.gain.value = depth / 2;
  this.baseNode.offset.value = 1 - depth / 2;

  this.els.rateValue.textContent = `${rate.toFixed(1)} Hz`;
  this.els.depthValue.textContent = `${Math.round(rawDepth * 100)}%`;
},

    reset() {
      this.els.enabled.checked = false;
      this.els.rate.value = 5;
      this.els.depth.value = 0.5;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
