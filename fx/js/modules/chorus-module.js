(function () {
  const module = {
    id: 'chorus',

    input: null,
    output: null,
    delay: null,
    lfo: null,
    lfoGain: null,
    wet: null,
    dry: null,

    rate: 1.2,
    depth: 0.003,
    mix: 0.5,

    els: {},

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';

      card.innerHTML = `
        <h3>
          Chorus
          <label class="inline-toggle">
            <input type="checkbox" id="chorus-enabled" />
            On
          </label>
        </h3>

        <div class="controls">
          <label class="slider-row">
            <span>Rate</span>
            <span class="value" id="chorus-rate-value">1.2 Hz</span>
          </label>
          <input type="range" id="chorus-rate" min="0.1" max="5" step="0.1" value="1.2" />

          <label class="slider-row">
            <span>Depth</span>
            <span class="value" id="chorus-depth-value">3 ms</span>
          </label>
          <input type="range" id="chorus-depth" min="0.001" max="0.01" step="0.001" value="0.003" />

          <label class="slider-row">
            <span>Mix</span>
            <span class="value" id="chorus-mix-value">50%</span>
          </label>
          <input type="range" id="chorus-mix" min="0" max="1" step="0.01" value="0.5" />
        </div>
      `;

      this.els.enabled = card.querySelector('#chorus-enabled');
      this.els.rate = card.querySelector('#chorus-rate');
      this.els.depth = card.querySelector('#chorus-depth');
      this.els.mix = card.querySelector('#chorus-mix');

      this.els.rateValue = card.querySelector('#chorus-rate-value');
      this.els.depthValue = card.querySelector('#chorus-depth-value');
      this.els.mixValue = card.querySelector('#chorus-mix-value');

      this.els.enabled.addEventListener('change', () => this.update());
      this.els.rate.addEventListener('input', () => this.update());
      this.els.depth.addEventListener('input', () => this.update());
      this.els.mix.addEventListener('input', () => this.update());

      return card;
    },

    init() {
      const ctx = AppState.audioContext;

      this.input = ctx.createGain();
      this.output = ctx.createGain();

      this.delay = ctx.createDelay(0.05);
      this.delay.delayTime.value = 0.02;

      this.lfo = ctx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.value = this.rate;

      this.lfoGain = ctx.createGain();
      this.lfoGain.gain.value = this.depth;

      this.wet = ctx.createGain();
      this.dry = ctx.createGain();

      this.wet.gain.value = 0;
      this.dry.gain.value = 1;

      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.delay.delayTime);

      this.input.connect(this.dry);
      this.input.connect(this.delay);

      this.delay.connect(this.wet);

      this.dry.connect(this.output);
      this.wet.connect(this.output);

      this.lfo.start();
      this.update();
    },

    setParam(param, value, time = 0.025) {
      const ctx = AppState.audioContext;
      if (!ctx || !param) return;
      param.setTargetAtTime(value, ctx.currentTime, time);
    },

    update() {
      if (!this.wet || !this.dry || !this.lfo || !this.lfoGain || !AppState.audioContext) return;

      const enabled = Boolean(this.els.enabled?.checked);

      this.rate = parseFloat(this.els.rate.value);
      this.depth = parseFloat(this.els.depth.value);
      this.mix = parseFloat(this.els.mix.value);

      this.setParam(this.lfo.frequency, this.rate);
      this.setParam(this.lfoGain.gain, enabled ? this.depth : 0);
      this.setParam(this.wet.gain, enabled ? this.mix : 0);
      this.setParam(this.dry.gain, enabled ? 1 - this.mix : 1);

      this.els.rateValue.textContent = `${this.rate.toFixed(1)} Hz`;
      this.els.depthValue.textContent = `${Math.round(this.depth * 1000)} ms`;
      this.els.mixValue.textContent = `${Math.round(this.mix * 100)}%`;
    },

    reset() {
      this.rate = 1.2;
      this.depth = 0.003;
      this.mix = 0.5;

      if (this.els.enabled) this.els.enabled.checked = false;
      if (this.els.rate) this.els.rate.value = this.rate;
      if (this.els.depth) this.els.depth.value = this.depth;
      if (this.els.mix) this.els.mix.value = this.mix;

      this.update();
    },

    connect(source) {
      source.connect(this.input);
      return this.output;
    }
  };

  ModuleRegistry.register(module);
})();
