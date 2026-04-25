(function () {
  const module = {
    id: 'flanger',
    enabled: false,

    input: null,
    output: null,
    delay: null,
    feedback: null,
    wet: null,
    dry: null,
    lfo: null,
    lfoGain: null,

    rate: 0.35,
    depth: 0.002,
    feedbackAmount: 0.35,
    mix: 0.5,

    els: {},

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';

      card.innerHTML = `
        <h3>
          Flanger
          <label class="inline-toggle">
            <input type="checkbox" id="flanger-enabled" />
            On
          </label>
        </h3>

        <div class="slider-row">
          Rate
          <input type="range" id="flanger-rate" min="0.05" max="5" step="0.05" value="0.35" />
        </div>

        <div class="slider-row">
          Depth
          <input type="range" id="flanger-depth" min="0.0005" max="0.006" step="0.0001" value="0.002" />
        </div>

        <div class="slider-row">
          Feedback
          <input type="range" id="flanger-feedback" min="0" max="0.85" step="0.01" value="0.35" />
        </div>

        <div class="slider-row">
          Mix
          <input type="range" id="flanger-mix" min="0" max="1" step="0.01" value="0.5" />
        </div>
      `;

      this.els.enabled = card.querySelector('#flanger-enabled');
      this.els.rate = card.querySelector('#flanger-rate');
      this.els.depth = card.querySelector('#flanger-depth');
      this.els.feedback = card.querySelector('#flanger-feedback');
      this.els.mix = card.querySelector('#flanger-mix');

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

      this.els.feedback.addEventListener('input', () => {
        this.feedbackAmount = parseFloat(this.els.feedback.value);
        if (this.feedback) this.feedback.gain.value = this.feedbackAmount;
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
      this.delay.delayTime.value = 0.004;

      this.feedback = ctx.createGain();
      this.feedback.gain.value = this.feedbackAmount;

      this.wet = ctx.createGain();
      this.dry = ctx.createGain();

      this.wet.gain.value = this.mix;
      this.dry.gain.value = 1 - this.mix;

      this.lfo = ctx.createOscillator();
      this.lfo.frequency.value = this.rate;

      this.lfoGain = ctx.createGain();
      this.lfoGain.gain.value = this.depth;

      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.delay.delayTime);

      this.input.connect(this.dry);
      this.input.connect(this.delay);

      this.delay.connect(this.feedback);
      this.feedback.connect(this.delay);

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
