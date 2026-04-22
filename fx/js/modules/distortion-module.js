(function () {
  const module = {
    id: 'distortion',

    input: null,
    output: null,

    odHP: null,
    odPre: null,
    odShaper: null,
    odLP: null,
    odTrim: null,

    distHP: null,
    distPre: null,
    distShaper: null,
    distLP: null,
    distTrim: null,

    fuzzHP: null,
    fuzzPre: null,
    fuzzShaper: null,
    fuzzLP: null,
    fuzzTrim: null,

    outputGain: null,

    els: {},

    clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    },

    lerp(a, b, t) {
      return a + (b - a) * t;
    },

    dbToGain(db) {
      return Math.pow(10, db / 20);
    },

    formatDb(db) {
      return `${db > 0 ? '+' : ''}${db} dB`;
    },

    makeLinearCurve() {
      const samples = 2048;
      const curve = new Float32Array(samples);

      for (let i = 0; i < samples; i++) {
        curve[i] = (i * 2) / (samples - 1) - 1;
      }

      return curve;
    },

    makeOverdriveCurve(amount) {
      const samples = 44100;
      const curve = new Float32Array(samples);
      const drive = this.lerp(1, 8, amount);

      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / (samples - 1) - 1;

        // Mild asymmetry for more pedal-like overdrive
        const shifted = x + 0.08 * amount;
        const y = Math.tanh(drive * shifted) / Math.tanh(drive);

        curve[i] = this.clamp(y - 0.04 * amount, -1, 1);
      }

      return curve;
    },

    makeDistortionCurve(amount) {
      const samples = 44100;
      const curve = new Float32Array(samples);
      const drive = this.lerp(1, 20, amount);

      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / (samples - 1) - 1;
        const y = Math.tanh(drive * x) / Math.tanh(drive);

        curve[i] = this.clamp(y, -1, 1);
      }

      return curve;
    },

    makeFuzzCurve(amount) {
      const samples = 44100;
      const curve = new Float32Array(samples);
      const drive = this.lerp(1, 45, amount);

      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / (samples - 1) - 1;
        const hard = Math.tanh(drive * x) / Math.tanh(drive);
        const squared = Math.sign(hard) * Math.pow(Math.abs(hard), 0.55 - 0.25 * amount);

        curve[i] = this.clamp(squared, -1, 1);
      }

      return curve;
    },

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';

      card.innerHTML = `
        <h3>Drive Stack</h3>
        <div class="controls">
          <div>
            <label for="distortion-overdrive">Overdrive</label>
            <div class="slider-row">
              <input type="range" id="distortion-overdrive" min="0" max="100" step="1" value="0" />
              <div class="value" id="distortion-overdrive-value"></div>
            </div>
          </div>

          <div>
            <label for="distortion-distortion">Distortion</label>
            <div class="slider-row">
              <input type="range" id="distortion-distortion" min="0" max="100" step="1" value="0" />
              <div class="value" id="distortion-distortion-value"></div>
            </div>
          </div>

          <div>
            <label for="distortion-fuzz">Fuzz</label>
            <div class="slider-row">
              <input type="range" id="distortion-fuzz" min="0" max="100" step="1" value="0" />
              <div class="value" id="distortion-fuzz-value"></div>
            </div>
          </div>

          <div>
            <label for="distortion-output">Output Gain</label>
            <div class="slider-row">
              <input type="range" id="distortion-output" min="-20" max="20" step="1" value="0" />
              <div class="value" id="distortion-output-value"></div>
            </div>
          </div>
        </div>
      `;

      return card;
    },

    init() {
      const ctx = AppState.audioContext;

      this.input = ctx.createGain();
      this.output = ctx.createGain();

      this.odHP = ctx.createBiquadFilter();
      this.odHP.type = 'highpass';
      this.odPre = ctx.createGain();
      this.odShaper = ctx.createWaveShaper();
      this.odLP = ctx.createBiquadFilter();
      this.odLP.type = 'lowpass';
      this.odTrim = ctx.createGain();

      this.distHP = ctx.createBiquadFilter();
      this.distHP.type = 'highpass';
      this.distPre = ctx.createGain();
      this.distShaper = ctx.createWaveShaper();
      this.distLP = ctx.createBiquadFilter();
      this.distLP.type = 'lowpass';
      this.distTrim = ctx.createGain();

      this.fuzzHP = ctx.createBiquadFilter();
      this.fuzzHP.type = 'highpass';
      this.fuzzPre = ctx.createGain();
      this.fuzzShaper = ctx.createWaveShaper();
      this.fuzzLP = ctx.createBiquadFilter();
      this.fuzzLP.type = 'lowpass';
      this.fuzzTrim = ctx.createGain();

      this.outputGain = ctx.createGain();

      this.odShaper.oversample = '4x';
      this.distShaper.oversample = '4x';
      this.fuzzShaper.oversample = '4x';

      this.input.connect(this.odHP);
      this.odHP.connect(this.odPre);
      this.odPre.connect(this.odShaper);
      this.odShaper.connect(this.odLP);
      this.odLP.connect(this.odTrim);

      this.odTrim.connect(this.distHP);
      this.distHP.connect(this.distPre);
      this.distPre.connect(this.distShaper);
      this.distShaper.connect(this.distLP);
      this.distLP.connect(this.distTrim);

      this.distTrim.connect(this.fuzzHP);
      this.fuzzHP.connect(this.fuzzPre);
      this.fuzzPre.connect(this.fuzzShaper);
      this.fuzzShaper.connect(this.fuzzLP);
      this.fuzzLP.connect(this.fuzzTrim);

      this.fuzzTrim.connect(this.outputGain);
      this.outputGain.connect(this.output);

      this.els.overdrive = document.getElementById('distortion-overdrive');
      this.els.overdriveValue = document.getElementById('distortion-overdrive-value');

      this.els.distortion = document.getElementById('distortion-distortion');
      this.els.distortionValue = document.getElementById('distortion-distortion-value');

      this.els.fuzz = document.getElementById('distortion-fuzz');
      this.els.fuzzValue = document.getElementById('distortion-fuzz-value');

      this.els.output = document.getElementById('distortion-output');
      this.els.outputValue = document.getElementById('distortion-output-value');

      this.els.overdrive.addEventListener('input', () => this.update());
      this.els.distortion.addEventListener('input', () => this.update());
      this.els.fuzz.addEventListener('input', () => this.update());
      this.els.output.addEventListener('input', () => this.update());

      this.linearCurve = this.makeLinearCurve();
      this.update();
    },

    connect(inputNode) {
      inputNode.connect(this.input);
      return this.output;
    },

    update() {
      const od = Number(this.els.overdrive.value) / 100;
      const dist = Number(this.els.distortion.value) / 100;
      const fuzz = Number(this.els.fuzz.value) / 100;
      const outDb = Number(this.els.output.value);

      // Overdrive: mild bass cut, soft asymmetric clipping, darker top end as it increases
      this.odHP.frequency.value = this.lerp(20, 150, od);
      this.odPre.gain.value = this.lerp(1, 6.5, od);
      this.odShaper.curve = od > 0 ? this.makeOverdriveCurve(od) : this.linearCurve;
      this.odLP.frequency.value = this.lerp(20000, 4200, od);
      this.odTrim.gain.value = this.lerp(1, 0.82, od);

      // Distortion: tighter low end, harder clipping, slightly brighter than OD
      this.distHP.frequency.value = this.lerp(20, 220, dist);
      this.distPre.gain.value = this.lerp(1, 12, dist);
      this.distShaper.curve = dist > 0 ? this.makeDistortionCurve(dist) : this.linearCurve;
      this.distLP.frequency.value = this.lerp(20000, 5200, dist);
      this.distTrim.gain.value = this.lerp(1, 0.68, dist);

      // Fuzz: lots of gain, flatter clipping, darker and thicker
      this.fuzzHP.frequency.value = this.lerp(20, 90, fuzz);
      this.fuzzPre.gain.value = this.lerp(1, 24, fuzz);
      this.fuzzShaper.curve = fuzz > 0 ? this.makeFuzzCurve(fuzz) : this.linearCurve;
      this.fuzzLP.frequency.value = this.lerp(20000, 3200, fuzz);
      this.fuzzTrim.gain.value = this.lerp(1, 0.52, fuzz);

      this.outputGain.gain.value = this.dbToGain(outDb);

      this.els.overdriveValue.textContent = `${Math.round(od * 100)}%`;
      this.els.distortionValue.textContent = `${Math.round(dist * 100)}%`;
      this.els.fuzzValue.textContent = `${Math.round(fuzz * 100)}%`;
      this.els.outputValue.textContent = this.formatDb(outDb);
    },

    reset() {
      this.els.overdrive.value = 0;
      this.els.distortion.value = 0;
      this.els.fuzz.value = 0;
      this.els.output.value = 0;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
