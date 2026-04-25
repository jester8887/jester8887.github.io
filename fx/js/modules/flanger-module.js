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

        <div class="controls">
          <label class="slider-row">
            <span>Rate</span>
            <span class="value" id="flanger-rate-value">0.35 Hz</span>
          </label>
          <input type="range" id="flanger-rate" min="0.05" max="5" step="0.05" value="0.35" />

          <label class="slider-row">
            <span>Depth</span>
            <span class="value" id="flanger-depth-value">2 ms</span>
          </label>
          <input type="range" id="flanger-depth" min="0.0005" max="0.006" step="0.0001" value="0.002" />

          <label class="slider-row">
            <span>Feedback</span>
            <span class="value" id="flanger-feedback-value">35%</span>
          </label>
          <input type="range" id="flanger-feedback" min="0" max="0.85" step="0.01" value="0.35" />

          <label class="slider-row">
            <span>Mix</span>
            <span class="value" id="flanger-mix-value">50%</span>
          </label>
          <input type="range" id="flanger-mix" min="0" max="1" step="0.01" value="0.5" />
        </div>
      `;

      this.els.enabled = card.querySelector('#flanger-enabled');
      this.els.rate = card.querySelector('#flanger-rate');
      this.els.depth = card.querySelector('#flanger-depth');
      this.els.feedback = card.querySelector('#flanger-feedback');
      this.els.mix = card.querySelector('#flanger-mix');

      this.els.rateValue = card.querySelector('#flanger-rate-value');
      this.els.depthValue = card.querySelector('#flanger-depth-value');
      this.els.feedbackValue = card.querySelector('#flanger-feedback-value');
      this.els.mixValue = card.querySelector('#flanger-mix-value');

      this.els.enabled.addEventListener('change', () => {
        this.enabled = this.els.enabled.checked;
        this.updateBypass();
      });

      this.els.rate.addEventListener('input', () => {
        this.rate = parseFloat(this.els.rate.value);
        this.els.rateValue.textContent = `${this.rate.toFixed(2)} Hz`;

        if (this.lfo) {
          this.lfo.frequency.setValueAtTime(this.rate, AppState.audioContext.currentTime);
        }
      });

      this.els.depth.addEventListener('input', () => {
        this.depth = parseFloat(this.els.depth.value);
        this.els.depthValue.textContent = `${(this.depth * 1000).toFixed(1)} ms`;

        if (this.lfoGain) {
          this.lfoGain.gain.setValueAtTime(this.depth, AppState.audioContext.currentTime);
        }
      });

      this.els.feedback.addEventListener('input', () => {
        this.feedbackAmount = parseFloat(this.els.feedback.value);
        this.els.feedbackValue.textContent = `${Math.round(this.feedbackAmount * 100)}%`;
        this.updateBypass();
      });

      this.els.mix.addEventListener('input', () => {
        this.mix = parseFloat(this.els.mix.value);
        this.els.mixValue.textContent = `${Math.round(this.mix * 100)}%`;
        this.updateBypass();
      });

      return card;
    },

    init() {
      const ctx = AppState.audioContext;

      this.input = ctx.createGain();
      this.output = ctx.createGain();

      this.delay = ctx.createDelay(0.02);
      this.delay.delayTime.value = 0.004;

      this.feedback = ctx.createGain();
      this.feedback.gain.value = 0;

      this.wet = ctx.createGain();
      this.dry = ctx.createGain();

      this.wet.gain.value = 0;
      this.dry.gain.value = 1;

      this.lfo = ctx.createOscillator();
      this.lfo.type = 'sine';
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
      this.updateBypass();
    },

    updateBypass() {
      if (!this.wet || !this.dry || !this.feedback || !AppState.audioContext) return;

      const now = AppState.audioContext.currentTime;

      if (this.enabled) {
        this.wet.gain.setValueAtTime(this.mix, now);
        this.dry.gain.setValueAtTime(1 - this.mix, now);
        this.feedback.gain.setValueAtTime(this.feedbackAmount, now);
      } else {
        this.wet.gain.setValueAtTime(0, now);
        this.dry.gain.setValueAtTime(1, now);
        this.feedback.gain.setValueAtTime(0, now);
      }
    },

    connect(source) {
      source.connect(this.input);
      return this.output;
    }
  };

  ModuleRegistry.register(module);
})();
