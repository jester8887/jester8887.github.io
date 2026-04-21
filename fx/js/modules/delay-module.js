(function () {
  const module = {
    id: 'delay',
    input: null,
    delay: null,
    feedback: null,
    wet: null,
    dry: null,
    output: null,
    els: {},

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';
      card.innerHTML = `
        <h3>
          Delay
          <label class="inline-toggle">
            <input type="checkbox" id="delay-enabled" />
            On
          </label>
        </h3>
        <div class="controls">
          <div>
            <label for="delay-time">Delay Time</label>
            <div class="slider-row">
              <input type="range" id="delay-time" min="0" max="1.2" step="0.01" value="0.25" />
              <div class="value" id="delay-time-value"></div>
            </div>
          </div>
          <div>
            <label for="delay-feedback">Feedback</label>
            <div class="slider-row">
              <input type="range" id="delay-feedback" min="0" max="0.9" step="0.01" value="0.35" />
              <div class="value" id="delay-feedback-value"></div>
            </div>
          </div>
          <div>
            <label for="delay-wet">Wet Mix</label>
            <div class="slider-row">
              <input type="range" id="delay-wet" min="0" max="1" step="0.01" value="0.25" />
              <div class="value" id="delay-wet-value"></div>
            </div>
          </div>
        </div>
      `;
      return card;
    },

    init() {
      const ctx = AppState.audioContext;

      this.input = ctx.createGain();
      this.delay = ctx.createDelay(2.0);
      this.feedback = ctx.createGain();
      this.wet = ctx.createGain();
      this.dry = ctx.createGain();
      this.output = ctx.createGain();

      this.input.connect(this.dry);
      this.dry.connect(this.output);

      this.input.connect(this.delay);
      this.delay.connect(this.wet);
      this.wet.connect(this.output);

      this.delay.connect(this.feedback);
      this.feedback.connect(this.delay);

      this.els.enabled = document.getElementById('delay-enabled');
      this.els.time = document.getElementById('delay-time');
      this.els.timeValue = document.getElementById('delay-time-value');
      this.els.feedback = document.getElementById('delay-feedback');
      this.els.feedbackValue = document.getElementById('delay-feedback-value');
      this.els.wet = document.getElementById('delay-wet');
      this.els.wetValue = document.getElementById('delay-wet-value');

      this.els.enabled.addEventListener('input', () => this.update());
      this.els.time.addEventListener('input', () => this.update());
      this.els.feedback.addEventListener('input', () => this.update());
      this.els.wet.addEventListener('input', () => this.update());

      this.update();
    },

    connect(inputNode) {
      inputNode.connect(this.input);
      return this.output;
    },

    update() {
      const enabled = this.els.enabled.checked;
      const time = enabled ? Number(this.els.time.value) : 0;
      const feedback = enabled ? Number(this.els.feedback.value) : 0;
      const wet = enabled ? Number(this.els.wet.value) : 0;

      this.delay.delayTime.value = time;
      this.feedback.gain.value = feedback;
      this.wet.gain.value = wet;
      this.dry.gain.value = enabled ? 1 : 1;

      this.els.timeValue.textContent = `${time.toFixed(2)} s`;
      this.els.feedbackValue.textContent = `${Math.round(feedback * 100)}%`;
      this.els.wetValue.textContent = `${Math.round(wet * 100)}%`;
    },

    reset() {
      this.els.enabled.checked = false;
      this.els.time.value = 0.25;
      this.els.feedback.value = 0.35;
      this.els.wet.value = 0.25;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
