(function () {
  const module = {
    id: 'noise-gate',
    enabled: false,

    input: null,
    output: null,
    gainNode: null,
    analyser: null,

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

        <div class="slider-row">
          Threshold
          <input type="range" id="noise-gate-threshold" min="0.005" max="0.2" step="0.005" value="0.03" />
        </div>

        <div class="slider-row">
          Release
          <input type="range" id="noise-gate-release" min="0.05" max="1.2" step="0.01" value="0.18" />
        </div>

        <div class="slider-row">
          Floor
          <input type="range" id="noise-gate-floor" min="0" max="0.2" step="0.01" value="0.02" />
        </div>
      `;

      this.els.enabled = card.querySelector('#noise-gate-enabled');
      this.els.threshold = card.querySelector('#noise-gate-threshold');
      this.els.release = card.querySelector('#noise-gate-release');
      this.els.floor = card.querySelector('#noise-gate-floor');

      this.els.enabled.addEventListener('change', () => {
        this.enabled = this.els.enabled.checked;
      });

      this.els.threshold.addEventListener('input', () => {
        this.threshold = parseFloat(this.els.threshold.value);
      });

      this.els.release.addEventListener('input', () => {
        this.release = parseFloat(this.els.release.value);
      });

      this.els.floor.addEventListener('input', () => {
        this.floor = parseFloat(this.els.floor.value);
      });

      return card;
    },

    init() {
      const ctx = AppState.audioContext;

      this.input = ctx.createGain();
      this.output = ctx.createGain();
      this.gainNode = ctx.createGain();
      this.analyser = ctx.createAnalyser();

      this.analyser.fftSize = 1024;
      this.data = new Uint8Array(this.analyser.fftSize);

      this.input.connect(this.analyser);
      this.input.connect(this.gainNode);
      this.gainNode.connect(this.output);

      this.startGate();
    },

    startGate() {
      const ctx = AppState.audioContext;

      const update = () => {
        this.analyser.getByteTimeDomainData(this.data);

        let sum = 0;
        for (let i = 0; i < this.data.length; i++) {
          const normalized = (this.data[i] - 128) / 128;
          sum += normalized * normalized;
        }

        const rms = Math.sqrt(sum / this.data.length);
        const targetGain = rms >= this.threshold ? 1 : this.floor;

        this.gainNode.gain.cancelScheduledValues(ctx.currentTime);
        this.gainNode.gain.setTargetAtTime(
          targetGain,
          ctx.currentTime,
          targetGain === 1 ? this.attack : this.release
        );

        this.animationId = requestAnimationFrame(update);
      };

      update();
    },

    connect(source) {
      source.connect(this.input);
      return this.output;
    }
  };

  ModuleRegistry.register(module);
})();
