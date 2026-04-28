(function () {
  const module = {
    id: 'noise-gate',

    input: null,
    output: null,
    gainNode: null,
    analyser: null,
    dry: null,

    threshold: 0.03,
    attack: 0.02,
    release: 0.18,
    floor: 0.02,

    els: {},
    data: null,
    animationId: null,

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';

      card.innerHTML = `
        <h3>
          Noise Gate
          <label class="inline-toggle">
            <input type="checkbox" id="noise-gate-enabled" />
            On
          </label>
        </h3>

        <div class="controls">
          <label class="slider-row">
            <span>Threshold</span>
            <span class="value" id="noise-gate-threshold-value">0.030</span>
          </label>
          <input type="range" id="noise-gate-threshold" min="0.005" max="0.2" step="0.005" value="0.03" />

          <label class="slider-row">
            <span>Release</span>
            <span class="value" id="noise-gate-release-value">0.18 s</span>
          </label>
          <input type="range" id="noise-gate-release" min="0.05" max="1.2" step="0.01" value="0.18" />

          <label class="slider-row">
            <span>Floor</span>
            <span class="value" id="noise-gate-floor-value">2%</span>
          </label>
          <input type="range" id="noise-gate-floor" min="0" max="0.2" step="0.01" value="0.02" />
        </div>
      `;

      this.els.enabled = card.querySelector('#noise-gate-enabled');
      this.els.threshold = card.querySelector('#noise-gate-threshold');
      this.els.release = card.querySelector('#noise-gate-release');
      this.els.floor = card.querySelector('#noise-gate-floor');

      this.els.thresholdValue = card.querySelector('#noise-gate-threshold-value');
      this.els.releaseValue = card.querySelector('#noise-gate-release-value');
      this.els.floorValue = card.querySelector('#noise-gate-floor-value');

      this.els.enabled.addEventListener('change', () => this.update());
      this.els.threshold.addEventListener('input', () => this.update());
      this.els.release.addEventListener('input', () => this.update());
      this.els.floor.addEventListener('input', () => this.update());

      return card;
    },

    init() {
      const ctx = AppState.audioContext;

      this.input = ctx.createGain();
      this.output = ctx.createGain();
      this.gainNode = ctx.createGain();
      this.dry = ctx.createGain();
      this.analyser = ctx.createAnalyser();

      this.gainNode.gain.value = 0;
      this.dry.gain.value = 1;

      this.analyser.fftSize = 1024;
      this.data = new Uint8Array(this.analyser.fftSize);

      this.input.connect(this.analyser);
      this.input.connect(this.gainNode);
      this.input.connect(this.dry);

      this.gainNode.connect(this.output);
      this.dry.connect(this.output);

      this.update();
    },

    isEnabled() {
      return Boolean(this.els.enabled?.checked);
    },

    setParam(param, value, time = 0.025) {
      const ctx = AppState.audioContext;
      if (!ctx || !param) return;
      param.setTargetAtTime(value, ctx.currentTime, time);
    },

    update() {
      if (!this.gainNode || !this.dry || !AppState.audioContext) return;

      this.threshold = parseFloat(this.els.threshold.value);
      this.release = parseFloat(this.els.release.value);
      this.floor = parseFloat(this.els.floor.value);

      this.els.thresholdValue.textContent = this.threshold.toFixed(3);
      this.els.releaseValue.textContent = `${this.release.toFixed(2)} s`;
      this.els.floorValue.textContent = `${Math.round(this.floor * 100)}%`;

      if (this.isEnabled()) {
        this.setParam(this.dry.gain, 0);
        if (!this.animationId) this.startGate();
      } else {
        this.stopGate();
        this.setParam(this.dry.gain, 1);
        this.setParam(this.gainNode.gain, 0);
      }
    },

    startGate() {
      if (this.animationId) return;

      const run = () => {
        if (!this.isEnabled()) {
          this.animationId = null;
          return;
        }

        if (!this.analyser || !this.gainNode || !this.data || !AppState.audioContext) {
          this.animationId = requestAnimationFrame(run);
          return;
        }

        const ctx = AppState.audioContext;
        const now = ctx.currentTime;

        this.analyser.getByteTimeDomainData(this.data);

        let sum = 0;
        for (let i = 0; i < this.data.length; i++) {
          const normalized = (this.data[i] - 128) / 128;
          sum += normalized * normalized;
        }

        const rms = Math.sqrt(sum / this.data.length);
        const targetGain = rms >= this.threshold ? 1 : this.floor;

        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setTargetAtTime(
          targetGain,
          now,
          targetGain === 1 ? this.attack : this.release
        );

        this.animationId = requestAnimationFrame(run);
      };

      this.animationId = requestAnimationFrame(run);
    },

    stopGate() {
      if (!this.animationId) return;
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    },

    reset() {
      this.threshold = 0.03;
      this.release = 0.18;
      this.floor = 0.02;

      if (this.els.enabled) this.els.enabled.checked = false;
      if (this.els.threshold) this.els.threshold.value = this.threshold;
      if (this.els.release) this.els.release.value = this.release;
      if (this.els.floor) this.els.floor.value = this.floor;

      this.update();
    },

    connect(source) {
      source.connect(this.input);
      return this.output;
    }
  };

  ModuleRegistry.register(module);
})();
