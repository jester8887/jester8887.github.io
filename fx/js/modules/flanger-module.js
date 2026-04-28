(function () {
  const module = {
    id: 'flanger',
    input: null,
    output: null,

    delay: null,
    feedback: null,
    wet: null,
    dry: null,

    toneFilter: null,

    lfo: null,
    lfoGain: null,

    rate: 0.22,
    manualDelay: 0.0022,
    depth: 0.0018,
    feedbackAmount: 0.38,
    mix: 0.5,
    toneHz: 12000,

    els: {},

    setParam(param, value, time = 0.025) {
      const ctx = AppState.audioContext;
      if (!ctx || !param) return;

      if (typeof param.setTargetAtTime === 'function') {
        param.setTargetAtTime(value, ctx.currentTime, time);
      } else {
        param.value = value;
      }
    },

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
            <span class="value" id="flanger-rate-value">0.22 Hz</span>
          </label>
          <input type="range" id="flanger-rate" min="0.03" max="1.5" step="0.01" value="0.22" />

          <label class="slider-row">
            <span>Delay</span>
            <span class="value" id="flanger-delay-value">2.2 ms</span>
          </label>
          <input type="range" id="flanger-delay" min="0.0005" max="0.006" step="0.0001" value="0.0022" />

          <label class="slider-row">
            <span>Sweep Depth</span>
            <span class="value" id="flanger-depth-value">1.8 ms</span>
          </label>
          <input type="range" id="flanger-depth" min="0.0002" max="0.0045" step="0.0001" value="0.0018" />

          <label class="slider-row">
            <span>Feedback</span>
            <span class="value" id="flanger-feedback-value">38%</span>
          </label>
          <input type="range" id="flanger-feedback" min="-0.75" max="0.75" step="0.01" value="0.38" />

          <label class="slider-row">
            <span>Mix</span>
            <span class="value" id="flanger-mix-value">50%</span>
          </label>
          <input type="range" id="flanger-mix" min="0" max="1" step="0.01" value="0.5" />

          <label class="slider-row">
            <span>Tone</span>
            <span class="value" id="flanger-tone-value">12000 Hz</span>
          </label>
          <input type="range" id="flanger-tone" min="3000" max="20000" step="100" value="12000" />
        </div>
      `;

      this.els.enabled = card.querySelector('#flanger-enabled');

      this.els.rate = card.querySelector('#flanger-rate');
      this.els.delay = card.querySelector('#flanger-delay');
      this.els.depth = card.querySelector('#flanger-depth');
      this.els.feedback = card.querySelector('#flanger-feedback');
      this.els.mix = card.querySelector('#flanger-mix');
      this.els.tone = card.querySelector('#flanger-tone');

      this.els.rateValue = card.querySelector('#flanger-rate-value');
      this.els.delayValue = card.querySelector('#flanger-delay-value');
      this.els.depthValue = card.querySelector('#flanger-depth-value');
      this.els.feedbackValue = card.querySelector('#flanger-feedback-value');
      this.els.mixValue = card.querySelector('#flanger-mix-value');
      this.els.toneValue = card.querySelector('#flanger-tone-value');

      this.els.enabled.addEventListener('change', () => this.update());

      this.els.rate.addEventListener('input', () => {
        this.rate = parseFloat(this.els.rate.value);
        this.update();
      });

      this.els.delay.addEventListener('input', () => {
        this.manualDelay = parseFloat(this.els.delay.value);
        this.update();
      });

      this.els.depth.addEventListener('input', () => {
        this.depth = parseFloat(this.els.depth.value);
        this.update();
      });

      this.els.feedback.addEventListener('input', () => {
        this.feedbackAmount = parseFloat(this.els.feedback.value);
        this.update();
      });

      this.els.mix.addEventListener('input', () => {
        this.mix = parseFloat(this.els.mix.value);
        this.update();
      });

      this.els.tone.addEventListener('input', () => {
        this.toneHz = parseFloat(this.els.tone.value);
        this.update();
      });

      return card;
    },

    init() {
      const ctx = AppState.audioContext;

      this.input = ctx.createGain();
      this.output = ctx.createGain();

      this.delay = ctx.createDelay(0.02);
      this.delay.delayTime.value = this.manualDelay;

      this.feedback = ctx.createGain();
      this.feedback.gain.value = 0;

      this.wet = ctx.createGain();
      this.dry = ctx.createGain();

      this.wet.gain.value = 0;
      this.dry.gain.value = 1;

      this.toneFilter = ctx.createBiquadFilter();
      this.toneFilter.type = 'lowpass';
      this.toneFilter.frequency.value = this.toneHz;
      this.toneFilter.Q.value = 0.6;

      this.lfo = ctx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.value = this.rate;

      this.lfoGain = ctx.createGain();
      this.lfoGain.gain.value = 0;

      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.delay.delayTime);

      this.input.connect(this.dry);
      this.input.connect(this.delay);

      this.delay.connect(this.feedback);
      this.feedback.connect(this.delay);

      this.delay.connect(this.toneFilter);
      this.toneFilter.connect(this.wet);

      this.dry.connect(this.output);
      this.wet.connect(this.output);

      this.lfo.start();
      this.update();
    },

    update() {
      if (
        !this.wet ||
        !this.dry ||
        !this.feedback ||
        !this.delay ||
        !this.lfo ||
        !this.lfoGain ||
        !this.toneFilter ||
        !AppState.audioContext
      ) {
        return;
      }

      const enabled = Boolean(this.els.enabled?.checked);

      const safeDelay = Math.max(0.0003, this.manualDelay);
      const safeDepth = Math.min(this.depth, safeDelay * 0.9);

      const wetTarget = enabled ? this.mix : 0;
      const dryTarget = enabled ? 1 : 1;
      const feedbackTarget = enabled ? this.feedbackAmount : 0;

      this.setParam(this.wet.gain, wetTarget);
      this.setParam(this.dry.gain, dryTarget);
      this.setParam(this.feedback.gain, feedbackTarget);

      this.setParam(this.delay.delayTime, safeDelay);
      this.setParam(this.lfo.frequency, this.rate);
      this.setParam(this.lfoGain.gain, enabled ? safeDepth : 0);

      this.setParam(this.toneFilter.frequency, enabled ? this.toneHz : 20000);
      this.setParam(this.toneFilter.Q, 0.6);

      this.els.rateValue.textContent = `${this.rate.toFixed(2)} Hz`;
      this.els.delayValue.textContent = `${(this.manualDelay * 1000).toFixed(1)} ms`;
      this.els.depthValue.textContent = `${(this.depth * 1000).toFixed(1)} ms`;
      this.els.feedbackValue.textContent = `${Math.round(this.feedbackAmount * 100)}%`;
      this.els.mixValue.textContent = `${Math.round(this.mix * 100)}%`;
      this.els.toneValue.textContent = `${Math.round(this.toneHz)} Hz`;
    },

    reset() {
      this.rate = 0.22;
      this.manualDelay = 0.0022;
      this.depth = 0.0018;
      this.feedbackAmount = 0.38;
      this.mix = 0.5;
      this.toneHz = 12000;

      if (this.els.enabled) this.els.enabled.checked = false;
      if (this.els.rate) this.els.rate.value = this.rate;
      if (this.els.delay) this.els.delay.value = this.manualDelay;
      if (this.els.depth) this.els.depth.value = this.depth;
      if (this.els.feedback) this.els.feedback.value = this.feedbackAmount;
      if (this.els.mix) this.els.mix.value = this.mix;
      if (this.els.tone) this.els.tone.value = this.toneHz;

      this.update();
    },

    connect(source) {
      source.connect(this.input);
      return this.output;
    }
  };

  ModuleRegistry.register(module);
})();
