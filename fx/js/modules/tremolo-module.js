(function () {
  const module = {
    id: 'tremolo',
    input: null,
    gainNode: null,
    output: null,

    osc: null,
    shaper: null,
    modDepth: null,
    modBase: null,

    els: {},

    createRoundedSquareCurve(amount = 6, samples = 2048) {
      const curve = new Float32Array(samples);

      for (let i = 0; i < samples; i++) {
        const x = (i / (samples - 1)) * 2 - 1; // -1..1
        const y = Math.tanh(amount * x) / Math.tanh(amount); // rounded square-ish, still smooth
        curve[i] = y;
      }

      return curve;
    },

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';
      card.innerHTML = `
        <h3>
          Tremolo
          <label class="inline-toggle">
            <input type="checkbox" id="tremolo-enabled" />
            On
          </label>
        </h3>
        <div class="controls">
          <div>
            <label for="tremolo-rate">Rate</label>
            <div class="slider-row">
              <input type="range" id="tremolo-rate" min="0.1" max="20" step="0.1" value="2.5" />
              <div class="value" id="tremolo-rate-value"></div>
            </div>
          </div>
          <div>
            <label for="tremolo-depth">Depth</label>
            <div class="slider-row">
              <input type="range" id="tremolo-depth" min="0" max="1" step="0.01" value="1" />
              <div class="value" id="tremolo-depth-value"></div>
            </div>
          </div>
        </div>
      `;
      return card;
    },

    init() {
      const ctx = AppState.audioContext;

      this.input = ctx.createGain();
      this.gainNode = ctx.createGain();
      this.output = ctx.createGain();

      this.osc = ctx.createOscillator();
      this.shaper = ctx.createWaveShaper();
      this.modDepth = ctx.createGain();
      this.modBase = ctx.createConstantSource();

      this.osc.type = 'sine';
      this.shaper.curve = this.createRoundedSquareCurve(7, 2048);
      this.shaper.oversample = '4x';

      // Control path:
      // osc (-1..1 sine) -> shaper (rounded square-ish -1..1)
      // -> modDepth (scales amount)
      // plus modBase (offsets center)
      // both summed into gainNode.gain
      this.osc.connect(this.shaper);
      this.shaper.connect(this.modDepth);
      this.modDepth.connect(this.gainNode.gain);
      this.modBase.connect(this.gainNode.gain);

      // Audio path
      this.input.connect(this.gainNode);
      this.gainNode.connect(this.output);

      this.osc.start();
      this.modBase.start();

      this.els.enabled = document.getElementById('tremolo-enabled');
      this.els.rate = document.getElementById('tremolo-rate');
      this.els.rateValue = document.getElementById('tremolo-rate-value');
      this.els.depth = document.getElementById('tremolo-depth');
      this.els.depthValue = document.getElementById('tremolo-depth-value');

      this.els.enabled.addEventListener('input', () => this.update());
      this.els.rate.addEventListener('input', () => this.update());
      this.els.depth.addEventListener('input', () => this.update());

      this.update();
    },

    connect(inputNode) {
      inputNode.connect(this.input);
      return this.output;
    },

    update() {
      const ctx = AppState.audioContext;
      const now = ctx.currentTime;

      const enabled = this.els.enabled.checked;
      const rate = enabled ? Number(this.els.rate.value) : 0.1;
      const rawDepth = enabled ? Number(this.els.depth.value) : 0;

      // Aggressive depth response so it gets strong fast
      const depth = Math.pow(rawDepth, 0.28);

      // At full depth, dip essentially to silence
      const minGain = 0.0;
      const maxGain = 1.0;

      // Desired range:
      // min = maxGain - depth * (maxGain - minGain)
      // max = maxGain
      const actualMin = maxGain - depth * (maxGain - minGain);

      // For bipolar control signal (-1..1), solve:
      // base + amount = maxGain
      // base - amount = actualMin
      const amount = (maxGain - actualMin) / 2;
      const base = (maxGain + actualMin) / 2;

      this.osc.frequency.cancelScheduledValues(now);
      this.modDepth.gain.cancelScheduledValues(now);
      this.modBase.offset.cancelScheduledValues(now);

      // Short smoothing to avoid zipper noise
      this.osc.frequency.setTargetAtTime(rate, now, 0.01);
      this.modDepth.gain.setTargetAtTime(amount, now, 0.01);
      this.modBase.offset.setTargetAtTime(base, now, 0.01);

      this.els.rateValue.textContent = `${rate.toFixed(1)} Hz`;
      this.els.depthValue.textContent = `${Math.round(rawDepth * 100)}%`;
    },

    reset() {
      this.els.enabled.checked = false;
      this.els.rate.value = 2.5;
      this.els.depth.value = 1;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
