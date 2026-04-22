(function () {
  const module = {
    id: 'distortion',

    input: null,
    output: null,

    odHP: null,
    odPre: null,
    odShaper: null,
    odShelf: null,
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
    fuzzShelf: null,
    fuzzLP: null,
    fuzzTrim: null,

    outputGain: null,

    settings: null,
    linearCurve: null,
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

    async loadSettings() {
      if (this.settings) return this.settings;

      const response = await fetch('json/distortion-settings.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to load distortion settings: ${response.status}`);
      }

      this.settings = await response.json();
      return this.settings;
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
      const s = this.settings.overdrive;
      const samples = 44100;
      const curve = new Float32Array(samples);
      const drive = this.lerp(s.curveDriveStart, s.curveDriveEnd, amount);

      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / (samples - 1) - 1;
        const shifted = x + s.curveShiftAmount * amount;
        const y = Math.tanh(drive * shifted) / Math.tanh(drive);
        curve[i] = this.clamp(y - s.curveOutputOffset * amount, -1, 1);
      }

      return curve;
    },

    makeDistortionCurve(amount) {
      const s = this.settings.distortion;
      const samples = 44100;
      const curve = new Float32Array(samples);
      const drive = this.lerp(s.curveDriveStart, s.curveDriveEnd, amount);

      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / (samples - 1) - 1;
        const y = Math.tanh(drive * x) / Math.tanh(drive);
        curve[i] = this.clamp(y, -1, 1);
      }

      return curve;
    },

    makeFuzzCurve(amount) {
      const s = this.settings.fuzz;
      const samples = 44100;
      const curve = new Float32Array(samples);
      const drive = this.lerp(s.curveDriveStart, s.curveDriveEnd, amount);
      const power = this.lerp(s.curvePowerStart, s.curvePowerEnd, amount);

      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / (samples - 1) - 1;
        const hard = Math.tanh(drive * x) / Math.tanh(drive);
        const squared = Math.sign(hard) * Math.pow(Math.abs(hard), power);
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

    async init() {
      await this.loadSettings();

      const ctx = AppState.audioContext;

      this.input = ctx.createGain();
      this.output = ctx.createGain();

      this.odHP = ctx.createBiquadFilter();
      this.odHP.type = 'highpass';
      this.odPre = ctx.createGain();
      this.odShaper = ctx.createWaveShaper();
      this.odShelf = ctx.createBiquadFilter();
      this.odShelf.type = this.settings.overdrive.shelfType;
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
      this.fuzzShelf = ctx.createBiquadFilter();
      this.fuzzShelf.type = this.settings.fuzz.shelfType;
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
      this.odShaper.connect(this.odShelf);
      this.odShelf.connect(this.odLP);
      this.odLP.connect(this.odTrim);

      this.odTrim.connect(this.distHP);
      this.distHP.connect(this.distPre);
      this.distPre.connect(this.distShaper);
      this.distShaper.connect(this.distLP);
      this.distLP.connect(this.distTrim);

      this.distTrim.connect(this.fuzzHP);
      this.fuzzHP.connect(this.fuzzPre);
      this.fuzzPre.connect(this.fuzzShaper);
      this.fuzzShaper.connect(this.fuzzShelf);
      this.fuzzShelf.connect(this.fuzzLP);
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

      const out = this.settings.output;
      this.els.output.min = out.minDb;
      this.els.output.max = out.maxDb;
      this.els.output.value = out.defaultDb;

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
      if (!this.settings) return;

      const od = Number(this.els.overdrive.value) / 100;
      const dist = Number(this.els.distortion.value) / 100;
      const fuzz = Number(this.els.fuzz.value) / 100;
      const outDb = Number(this.els.output.value);

      const ods = this.settings.overdrive;
      const ds = this.settings.distortion;
      const fs = this.settings.fuzz;

      this.odHP.frequency.value = this.lerp(ods.hpStartHz, ods.hpEndHz, od);
      this.odPre.gain.value = this.lerp(ods.preGainStart, ods.preGainEnd, od);
      this.odShaper.curve = od > 0 ? this.makeOverdriveCurve(od) : this.linearCurve;
      this.odShelf.frequency.value = ods.shelfFrequencyHz;
      this.odShelf.gain.value = ods.shelfGainDb;
      this.odLP.frequency.value = this.lerp(ods.lpStartHz, ods.lpEndHz, od);
      this.odTrim.gain.value = this.lerp(ods.trimStart, ods.trimEnd, od);

      this.distHP.frequency.value = this.lerp(ds.hpStartHz, ds.hpEndHz, dist);
      this.distPre.gain.value = this.lerp(ds.preGainStart, ds.preGainEnd, dist);
      this.distShaper.curve = dist > 0 ? this.makeDistortionCurve(dist) : this.linearCurve;
      this.distLP.frequency.value = this.lerp(ds.lpStartHz, ds.lpEndHz, dist);
      this.distTrim.gain.value = this.lerp(ds.trimStart, ds.trimEnd, dist);

      this.fuzzHP.frequency.value = this.lerp(fs.hpStartHz, fs.hpEndHz, fuzz);
      this.fuzzPre.gain.value = this.lerp(fs.preGainStart, fs.preGainEnd, fuzz);
      this.fuzzShaper.curve = fuzz > 0 ? this.makeFuzzCurve(fuzz) : this.linearCurve;
      this.fuzzShelf.frequency.value = fs.shelfFrequencyHz;
      this.fuzzShelf.gain.value = fs.shelfGainDb;
      this.fuzzLP.frequency.value = this.lerp(fs.lpStartHz, fs.lpEndHz, fuzz);
      this.fuzzTrim.gain.value = this.lerp(fs.trimStart, fs.trimEnd, fuzz);

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
      this.els.output.value = this.settings ? this.settings.output.defaultDb : 0;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
