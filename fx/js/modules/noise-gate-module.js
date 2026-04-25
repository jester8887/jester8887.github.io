(function () {
  const module = {
    id: 'noise-gate',
    enabled: false,

    input: null,
    output: null,
    gainNode: null,
    analyser: null,
    dry: null, // bypass path

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

      this.els.enabled.addEventListener('change', () => {
        this.enabled = this.els.enabled.checked;
        this.updateBypass();
      });

      this.els.threshold.addEventListener('input', () => {
        this.threshold = parseFloat(this.els.threshold.value);
        this.els.thresholdValue.textContent = this.threshold.toFixed(3);
      });

      this.els.release.addEventListener('input', () => {
        this.release = parseFloat(this.els.release.value);
        this.els.releaseValue.textContent = `${this.release.toFixed(2)} s`;
      });

      this.els.floor.addEventListener('input', () => {
        this.floor = parseFloat(this.els.floor.value);
        this.els.floorValue.textContent = `${Math.round(this.floor * 100)}%`;
      });

      return card;
    },

    init() {
      const ctx = AppState.audioContext;

      this.input = ctx.createGain();
      this.output = ctx.createGain();
      this.gainNode = ctx.createGain();
      this.analyser = ctx.createAnalyser();
      this.dry = ctx.createGain();

      this.gainNode.gain.value = 1;
      this.dry.gain.value = 1;

      this.analyser.fftSize = 1024;
      this.data = new Uint8Array(this.analyser.fftSize);

      // routing
      this.input.connect(this.analyser);
      this.input.connect(this.gainNode);
      this.input.connect(this.dry);

      this.gainNode.connect(this.output);
      this.dry.connect(this.output);

      this.startGate();
      this.updateBypass();
    },

    updateBypass() {
      if (!this.gainNode || !this.dry || !AppState.audioContext) return;

      const now = AppState.audioContext.currentTime;

      if (this.enabled) {
        this.gainNode.gain.setValueAtTime(1, now);
        this.dry.gain.setValueAtTime(0, now);
      } else {
        this.gainNode.gain.setValueAtTime(0, now);
        this.dry.gain.setValueAtTime(1, now);
      }
    },

    startGate() {
      const update = () => {
        if (!this.analyser || !this.gainNode || !this.data || !AppState.audioContext) {
          this.animationId = requestAnimationFrame(update);
          return;
        }

        if (!this.enabled) {
          this.animationId = requestAnimationFrame(update);
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

        this.animationId = requestAnimationFrame(update);
      };

      if (!this.animationId) {
        update();
      }
    },

    connect(source) {
      source.connect(this.input);
      return this.output;
    }
  };

  ModuleRegistry.register(module);
})();
