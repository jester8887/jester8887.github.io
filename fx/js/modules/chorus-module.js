(function () {
  const module = {
    id: 'chorus',
    enabled: false,

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

      this.els.enabled.addEventListener('change', () => {
        this.enabled = this.els.enabled.checked;
      });

      this.els.rate.addEventListener('input', () => {
        this.rate = parseFloat(this.els.rate.value);
        this.els.rateValue.textContent = `${this.rate.toFixed(1)} Hz`;

        if (this.lfo) {
          this.lfo.frequency.setValueAtTime(this.rate, AppState.audioContext.currentTime);
        }
      });

      this.els.depth.addEventListener('input', () => {
        this.depth = parseFloat(this.els.depth.value);
        this.els.depthValue.textContent = `${Math.round(this.depth * 1000)} ms`;

        if (this.lfoGain) {
          this.lfoGain.gain.setValueAtTime(this.depth, AppState.audioContext.currentTime);
        }
      });

      this.els.mix.addEventListener('input', () => {
        this.mix = parseFloat(this.els.mix.value);
        this.els.mixValue.textContent = `${Math.round(this.mix * 100)}%`;

        if (this.wet && this.dry) {
          this.wet.gain.setValueAtTime(this.mix, AppState.audioContext.currentTime);
          this.dry.gain.setValueAtTime(1 - this.mix, AppState.audioContext.currentTime);
        }
      });

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

      this.wet.gain.value = this.mix;
      this.dry.gain.value = 1 - this.mix;

      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.delay.delayTime);

      this.input.connect(this.dry);
      this.input.connect(this.delay);

      this.delay.connect(this.wet);

      this.dry.connect(this.output);
      this.wet.connect(this.output);

      this.lfo.start();
    },

    connect(source) {
      source.connect(this.input);
      return this.output;
    }
  };

  ModuleRegistry.register(module);
})();
