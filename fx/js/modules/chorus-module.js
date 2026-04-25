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

    depth: 0.003,   // seconds
    rate: 1.2,      // Hz
    mix: 0.5,

    els: {},

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';

      card.innerHTML = `
        <h3>
          Chorus
          <label class="inline-toggle">
            <input type="checkbox" id="chorus-enabled"/>
            On
          </label>
        </h3>

        <div class="slider-row">
          Rate
          <input type="range" id="chorus-rate" min="0.1" max="5" step="0.1" value="1.2"/>
        </div>

        <div class="slider-row">
          Depth
          <input type="range" id="chorus-depth" min="0.001" max="0.01" step="0.001" value="0.003"/>
        </div>

        <div class="slider-row">
          Mix
          <input type="range" id="chorus-mix" min="0" max="1" step="0.01" value="0.5"/>
        </div>
      `;

      this.els.enabled = card.querySelector('#chorus-enabled');
      this.els.rate = card.querySelector('#chorus-rate');
      this.els.depth = card.querySelector('#chorus-depth');
      this.els.mix = card.querySelector('#chorus-mix');

      this.els.enabled.addEventListener('change', () => {
        this.enabled = this.els.enabled.checked;
      });

      this.els.rate.addEventListener('input', () => {
        this.rate = parseFloat(this.els.rate.value);
        if (this.lfo) this.lfo.frequency.value = this.rate;
      });

      this.els.depth.addEventListener('input', () => {
        this.depth = parseFloat(this.els.depth.value);
        if (this.lfoGain) this.lfoGain.gain.value = this.depth;
      });

      this.els.mix.addEventListener('input', () => {
        this.mix = parseFloat(this.els.mix.value);
        if (this.wet && this.dry) {
          this.wet.gain.value = this.mix;
          this.dry.gain.value = 1 - this.mix;
        }
      });

      return card;
    },

    init() {
      const ctx = AppState.audioContext;

      this.input = ctx.createGain();
      this.output = ctx.createGain();

      this.delay = ctx.createDelay();
      this.delay.delayTime.value = 0.02;

      this.lfo = ctx.createOscillator();
      this.lfo.frequency.value = this.rate;

      this.lfoGain = ctx.createGain();
      this.lfoGain.gain.value = this.depth;

      this.wet = ctx.createGain();
      this.dry = ctx.createGain();

      this.wet.gain.value = this.mix;
      this.dry.gain.value = 1 - this.mix;

      // modulation
      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.delay.delayTime);

      // routing
      this.input.connect(this.delay);
      this.input.connect(this.dry);

      this.delay.connect(this.wet);

      this.wet.connect(this.output);
      this.dry.connect(this.output);

      this.lfo.start();
    },

    connect(source) {
      source.connect(this.input);
      return this.output;
    }
  };

  ModuleRegistry.register(module);
})();
