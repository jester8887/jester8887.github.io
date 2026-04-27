(function () {
  const module = {
    id: 'distortion',

    input: null,
    output: null,

    dryGain: null,
    wetInput: null,
    wetOutput: null,

    odHP: null,
    odMid: null,
    odPre: null,
    odShaper: null,
    odPostTone: null,
    odLP: null,
    odTrim: null,

    distHP: null,
    distMid: null,
    distPre: null,
    distShaper: null,
    distPostTone: null,
    distLP: null,
    distTrim: null,

    fuzzHP: null,
    fuzzMid: null,
    fuzzPre: null,
    fuzzShaper: null,
    fuzzPostTone: null,
    fuzzLP: null,
    fuzzTrim: null,

    sagCompressor: null,

    cabHP: null,
    cabBody: null,
    cabPresence: null,
    cabLP: null,

    wetGain: null,
    outputGain: null,

    settings: null,
    curveCache: new Map(),
    linearCurve: null,
    els: {},

    defaultSettings: {
  output: {
    minDb: -20,
    maxDb: 20,
    defaultDb: 0
  },

  mix: {
    dryWhenEnabled: 0.06,
    wetWhenEnabled: 1.0
  },

  overdrive: {
    hpStartHz: 85,
    hpEndHz: 135,

    midFreqHz: 620,
    midQ: 0.9,
    midGainStartDb: 0,
    midGainEndDb: 2.5,

    preGainStartDb: 0,
    preGainEndDb: 15,

    curveDriveStart: 1.1,
    curveDriveEnd: 3.6,
    curveAsymStart: 0.97,
    curveAsymEnd: 0.74,
    curveBiasStart: 0,
    curveBiasEnd: 0.055,
    curveSoftnessStart: 0.98,
    curveSoftnessEnd: 0.86,

    toneFreqHz: 1400,
    toneGainStartDb: 0,
    toneGainEndDb: -4,

    lpStartHz: 7200,
    lpEndHz: 3600,

    trimStartDb: 0,
    trimEndDb: -6
  },

  distortion: {
    hpStartHz: 70,
    hpEndHz: 120,

    midFreqHz: 900,
    midQ: 0.8,
    midGainStartDb: 0,
    midGainEndDb: 2,

    preGainStartDb: 0,
    preGainEndDb: 22,

    curveDriveStart: 1.35,
    curveDriveEnd: 8.5,
    curveAsymStart: 0.94,
    curveAsymEnd: 0.68,
    curveBiasStart: 0,
    curveBiasEnd: 0.055,
    curveFoldStart: 0.03,
    curveFoldEnd: 0.15,

    toneFreqHz: 2200,
    toneGainStartDb: 0,
    toneGainEndDb: -2.5,

    lpStartHz: 8500,
    lpEndHz: 5000,

    trimStartDb: 0,
    trimEndDb: -10
  },

  fuzz: {
    hpStartHz: 100,
    hpEndHz: 190,

    midFreqHz: 1100,
    midQ: 1.0,
    midGainStartDb: 0,
    midGainEndDb: 2,

    preGainStartDb: 0,
    preGainEndDb: 31,

    curveDriveStart: 2.6,
    curveDriveEnd: 18,
    curveAsymStart: 0.82,
    curveAsymEnd: 0.38,
    curveBiasStart: 0.03,
    curveBiasEnd: 0.26,
    curvePowerStart: 0.9,
    curvePowerEnd: 0.42,

    toneFreqHz: 2600,
    toneGainStartDb: 0,
    toneGainEndDb: 1.5,

    lpStartHz: 9000,
    lpEndHz: 7200,

    trimStartDb: 0,
    trimEndDb: -16
  },

  sag: {
    thresholdDb: -20,
    kneeDb: 18,
    ratio: 2.2,
    attack: 0.008,
    release: 0.18
  },

  cab: {
    hpHz: 75,

    bodyFreqHz: 180,
    bodyQ: 0.75,
    bodyGainDb: 1.2,

    presenceFreqHz: 2600,
    presenceQ: 0.8,
    presenceGainDb: 0.8,

    lpHz: 7000,
    lpQ: 0.7
  }
},

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

    setParam(param, value, time = 0.015) {
      const ctx = AppState.audioContext;
      const now = ctx.currentTime;

      if (typeof param.setTargetAtTime === 'function') {
        param.setTargetAtTime(value, now, time);
      } else {
        param.value = value;
      }
    },

    async loadSettings() {
      if (this.settings) return this.settings;

      try {
        const response = await fetch('json/distortion-settings.json', { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(`Failed to load distortion settings: ${response.status}`);
        }

        const externalSettings = await response.json();
        this.settings = this.deepMerge(this.defaultSettings, externalSettings);
      } catch (error) {
        console.warn('Using built-in distortion settings fallback.', error);
        this.settings = this.defaultSettings;
      }

      return this.settings;
    },

    deepMerge(base, override) {
      const output = Array.isArray(base) ? [...base] : { ...base };

      if (!override || typeof override !== 'object') {
        return output;
      }

      Object.keys(override).forEach((key) => {
        const baseValue = output[key];
        const overrideValue = override[key];

        if (
          baseValue &&
          overrideValue &&
          typeof baseValue === 'object' &&
          typeof overrideValue === 'object' &&
          !Array.isArray(baseValue) &&
          !Array.isArray(overrideValue)
        ) {
          output[key] = this.deepMerge(baseValue, overrideValue);
        } else {
          output[key] = overrideValue;
        }
      });

      return output;
    },

    makeLinearCurve() {
      const samples = 2048;
      const curve = new Float32Array(samples);

      for (let i = 0; i < samples; i++) {
        curve[i] = (i * 2) / (samples - 1) - 1;
      }

      return curve;
    },

    curveKey(type, amount) {
      const rounded = Math.round(amount * 100);
      return `${type}-${rounded}`;
    },

    getCurve(type, amount) {
      if (amount <= 0) return this.linearCurve;

      const key = this.curveKey(type, amount);

      if (this.curveCache.has(key)) {
        return this.curveCache.get(key);
      }

      let curve;

      if (type === 'overdrive') {
        curve = this.makeOverdriveCurve(amount);
      } else if (type === 'distortion') {
        curve = this.makeDistortionCurve(amount);
      } else {
        curve = this.makeFuzzCurve(amount);
      }

      this.curveCache.set(key, curve);
      return curve;
    },

    makeOverdriveCurve(amount) {
      const s = this.settings.overdrive;
      const samples = 4096;
      const curve = new Float32Array(samples);

      const drive = this.lerp(s.curveDriveStart, s.curveDriveEnd, amount);
      const asym = this.lerp(s.curveAsymStart, s.curveAsymEnd, amount);
      const bias = this.lerp(s.curveBiasStart, s.curveBiasEnd, amount);
      const softness = this.lerp(s.curveSoftnessStart, s.curveSoftnessEnd, amount);

      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / (samples - 1) - 1;
        const biased = x + bias;

        const posDrive = drive;
        const negDrive = drive * asym;

        const shaped = biased >= 0
          ? Math.tanh(biased * posDrive)
          : Math.tanh(biased * negDrive);

        const normalized = shaped / Math.tanh(drive);
        const rounded = Math.sign(normalized) * Math.pow(Math.abs(normalized), softness);

        curve[i] = this.clamp(rounded - bias * 0.42, -1, 1);
      }

      return curve;
    },

    makeDistortionCurve(amount) {
      const s = this.settings.distortion;
      const samples = 4096;
      const curve = new Float32Array(samples);

      const drive = this.lerp(s.curveDriveStart, s.curveDriveEnd, amount);
      const asym = this.lerp(s.curveAsymStart, s.curveAsymEnd, amount);
      const bias = this.lerp(s.curveBiasStart, s.curveBiasEnd, amount);
      const fold = this.lerp(s.curveFoldStart, s.curveFoldEnd, amount);

      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / (samples - 1) - 1;
        const biased = x + bias;

        const posDrive = drive;
        const negDrive = drive * asym;

        let y = biased >= 0
          ? Math.tanh(biased * posDrive)
          : Math.tanh(biased * negDrive);

        y = y / Math.tanh(drive);

        const edge = Math.sin(y * Math.PI * 0.5);
        const folded = y * (1 - fold) + edge * fold;

        curve[i] = this.clamp(folded - bias * 0.35, -1, 1);
      }

      return curve;
    },

    makeFuzzCurve(amount) {
      const s = this.settings.fuzz;
      const samples = 4096;
      const curve = new Float32Array(samples);

      const drive = this.lerp(s.curveDriveStart, s.curveDriveEnd, amount);
      const asym = this.lerp(s.curveAsymStart, s.curveAsymEnd, amount);
      const bias = this.lerp(s.curveBiasStart, s.curveBiasEnd, amount);
      const power = this.lerp(s.curvePowerStart, s.curvePowerEnd, amount);

      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / (samples - 1) - 1;
        const biased = x + bias;

        const posDrive = drive;
        const negDrive = drive * asym;

        let y = biased >= 0
          ? Math.tanh(biased * posDrive)
          : Math.tanh(biased * negDrive);

        y = y / Math.tanh(drive);

        const broken = Math.sign(y) * Math.pow(Math.abs(y), power);
        const gated = Math.abs(x) < 0.006 * amount ? 0 : broken;

        curve[i] = this.clamp(gated - bias * 0.28, -1, 1);
      }

      return curve;
    },

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';

      card.innerHTML = `
        <h3>
          Analog Drive Stack
          <label class="inline-toggle">
            <input type="checkbox" id="distortion-enabled" />
            On
          </label>
        </h3>

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

      this.dryGain = ctx.createGain();
      this.wetInput = ctx.createGain();
      this.wetOutput = ctx.createGain();

      this.odHP = ctx.createBiquadFilter();
      this.odHP.type = 'highpass';

      this.odMid = ctx.createBiquadFilter();
      this.odMid.type = 'peaking';

      this.odPre = ctx.createGain();

      this.odShaper = ctx.createWaveShaper();
      this.odShaper.oversample = '4x';

      this.odPostTone = ctx.createBiquadFilter();
      this.odPostTone.type = 'highshelf';

      this.odLP = ctx.createBiquadFilter();
      this.odLP.type = 'lowpass';

      this.odTrim = ctx.createGain();

      this.distHP = ctx.createBiquadFilter();
      this.distHP.type = 'highpass';

      this.distMid = ctx.createBiquadFilter();
      this.distMid.type = 'peaking';

      this.distPre = ctx.createGain();

      this.distShaper = ctx.createWaveShaper();
      this.distShaper.oversample = '4x';

      this.distPostTone = ctx.createBiquadFilter();
      this.distPostTone.type = 'highshelf';

      this.distLP = ctx.createBiquadFilter();
      this.distLP.type = 'lowpass';

      this.distTrim = ctx.createGain();

      this.fuzzHP = ctx.createBiquadFilter();
      this.fuzzHP.type = 'highpass';

      this.fuzzMid = ctx.createBiquadFilter();
      this.fuzzMid.type = 'peaking';

      this.fuzzPre = ctx.createGain();

      this.fuzzShaper = ctx.createWaveShaper();
      this.fuzzShaper.oversample = '4x';

      this.fuzzPostTone = ctx.createBiquadFilter();
      this.fuzzPostTone.type = 'highshelf';

      this.fuzzLP = ctx.createBiquadFilter();
      this.fuzzLP.type = 'lowpass';

      this.fuzzTrim = ctx.createGain();

      this.sagCompressor = ctx.createDynamicsCompressor();

      this.cabHP = ctx.createBiquadFilter();
      this.cabHP.type = 'highpass';

      this.cabBody = ctx.createBiquadFilter();
      this.cabBody.type = 'peaking';

      this.cabPresence = ctx.createBiquadFilter();
      this.cabPresence.type = 'peaking';

      this.cabLP = ctx.createBiquadFilter();
      this.cabLP.type = 'lowpass';

      this.wetGain = ctx.createGain();
      this.outputGain = ctx.createGain();

      this.input.connect(this.dryGain);
      this.dryGain.connect(this.outputGain);

      this.input.connect(this.wetInput);
      this.wetInput.connect(this.odHP);

      this.odHP.connect(this.odMid);
      this.odMid.connect(this.odPre);
      this.odPre.connect(this.odShaper);
      this.odShaper.connect(this.odPostTone);
      this.odPostTone.connect(this.odLP);
      this.odLP.connect(this.odTrim);

      this.odTrim.connect(this.distHP);
      this.distHP.connect(this.distMid);
      this.distMid.connect(this.distPre);
      this.distPre.connect(this.distShaper);
      this.distShaper.connect(this.distPostTone);
      this.distPostTone.connect(this.distLP);
      this.distLP.connect(this.distTrim);

      this.distTrim.connect(this.fuzzHP);
      this.fuzzHP.connect(this.fuzzMid);
      this.fuzzMid.connect(this.fuzzPre);
      this.fuzzPre.connect(this.fuzzShaper);
      this.fuzzShaper.connect(this.fuzzPostTone);
      this.fuzzPostTone.connect(this.fuzzLP);
      this.fuzzLP.connect(this.fuzzTrim);

      this.fuzzTrim.connect(this.sagCompressor);
      this.sagCompressor.connect(this.cabHP);
      this.cabHP.connect(this.cabBody);
      this.cabBody.connect(this.cabPresence);
      this.cabPresence.connect(this.cabLP);
      this.cabLP.connect(this.wetGain);
      this.wetGain.connect(this.outputGain);

      this.outputGain.connect(this.output);

      this.els.enabled = document.getElementById('distortion-enabled');

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

      this.els.enabled.addEventListener('input', () => this.update());
      this.els.overdrive.addEventListener('input', () => this.update());
      this.els.distortion.addEventListener('input', () => this.update());
      this.els.fuzz.addEventListener('input', () => this.update());
      this.els.output.addEventListener('input', () => this.update());

      this.linearCurve = this.makeLinearCurve();

      this.configureStaticCab();
      this.configureSag();
      this.update();
    },

    configureSag() {
      const s = this.settings.sag;

      this.sagCompressor.threshold.value = s.thresholdDb;
      this.sagCompressor.knee.value = s.kneeDb;
      this.sagCompressor.ratio.value = s.ratio;
      this.sagCompressor.attack.value = s.attack;
      this.sagCompressor.release.value = s.release;
    },

    configureStaticCab() {
      const c = this.settings.cab;

      this.cabHP.frequency.value = c.hpHz;
      this.cabHP.Q.value = 0.707;

      this.cabBody.frequency.value = c.bodyFreqHz;
      this.cabBody.Q.value = c.bodyQ;
      this.cabBody.gain.value = c.bodyGainDb;

      this.cabPresence.frequency.value = c.presenceFreqHz;
      this.cabPresence.Q.value = c.presenceQ;
      this.cabPresence.gain.value = c.presenceGainDb;

      this.cabLP.frequency.value = c.lpHz;
      this.cabLP.Q.value = c.lpQ;
    },

    connect(inputNode) {
      inputNode.connect(this.input);
      return this.output;
    },

    setStage(stage, amount, settings, shaper, curveType) {
      const active = amount > 0;

      const preGainDb = this.lerp(settings.preGainStartDb, settings.preGainEndDb, amount);
      const midGainDb = this.lerp(settings.midGainStartDb, settings.midGainEndDb, amount);
      const toneGainDb = this.lerp(settings.toneGainStartDb, settings.toneGainEndDb, amount);
      const trimDb = this.lerp(settings.trimStartDb, settings.trimEndDb, amount);

      this.setParam(stage.hp.frequency, this.lerp(settings.hpStartHz, settings.hpEndHz, amount));
      this.setParam(stage.hp.Q, 0.707);

      this.setParam(stage.mid.frequency, settings.midFreqHz);
      this.setParam(stage.mid.Q, settings.midQ);
      this.setParam(stage.mid.gain, active ? midGainDb : 0);

      this.setParam(stage.pre.gain, active ? this.dbToGain(preGainDb) : 1);

      shaper.curve = active ? this.getCurve(curveType, amount) : this.linearCurve;

      this.setParam(stage.postTone.frequency, settings.toneFreqHz);
      this.setParam(stage.postTone.gain, active ? toneGainDb : 0);

      this.setParam(stage.lp.frequency, this.lerp(settings.lpStartHz, settings.lpEndHz, amount));
      this.setParam(stage.lp.Q, 0.707);

      this.setParam(stage.trim.gain, active ? this.dbToGain(trimDb) : 1);
    },

    update() {
      if (!this.settings || !this.els.enabled) return;

      const enabled = this.els.enabled.checked;

      const od = enabled ? Number(this.els.overdrive.value) / 100 : 0;
      const dist = enabled ? Number(this.els.distortion.value) / 100 : 0;
      const fuzz = enabled ? Number(this.els.fuzz.value) / 100 : 0;
      const outDb = enabled ? Number(this.els.output.value) : 0;

      const anyDrive = od > 0 || dist > 0 || fuzz > 0;
      const actuallyWet = enabled && anyDrive;

      const mix = this.settings.mix;
      const dryTarget = actuallyWet ? mix.dryWhenEnabled : 1;
      const wetInputTarget = actuallyWet ? 1 : 0;
      const wetOutputTarget = actuallyWet ? mix.wetWhenEnabled : 0;

      this.setParam(this.dryGain.gain, dryTarget);
      this.setParam(this.wetInput.gain, wetInputTarget);
      this.setParam(this.wetGain.gain, wetOutputTarget);

      this.setStage(
        {
          hp: this.odHP,
          mid: this.odMid,
          pre: this.odPre,
          postTone: this.odPostTone,
          lp: this.odLP,
          trim: this.odTrim
        },
        od,
        this.settings.overdrive,
        this.odShaper,
        'overdrive'
      );

      this.setStage(
        {
          hp: this.distHP,
          mid: this.distMid,
          pre: this.distPre,
          postTone: this.distPostTone,
          lp: this.distLP,
          trim: this.distTrim
        },
        dist,
        this.settings.distortion,
        this.distShaper,
        'distortion'
      );

      this.setStage(
        {
          hp: this.fuzzHP,
          mid: this.fuzzMid,
          pre: this.fuzzPre,
          postTone: this.fuzzPostTone,
          lp: this.fuzzLP,
          trim: this.fuzzTrim
        },
        fuzz,
        this.settings.fuzz,
        this.fuzzShaper,
        'fuzz'
      );

      const driveTotal = this.clamp(od + dist + fuzz, 0, 1);
      const cab = this.settings.cab;

      this.setParam(this.cabLP.frequency, this.lerp(7600, cab.lpHz, driveTotal));
      this.setParam(this.cabPresence.gain, actuallyWet ? cab.presenceGainDb : 0);
      this.setParam(this.cabBody.gain, actuallyWet ? cab.bodyGainDb : 0);

      this.setParam(this.outputGain.gain, this.dbToGain(outDb));

      this.els.overdriveValue.textContent = `${Math.round(Number(this.els.overdrive.value))}%`;
      this.els.distortionValue.textContent = `${Math.round(Number(this.els.distortion.value))}%`;
      this.els.fuzzValue.textContent = `${Math.round(Number(this.els.fuzz.value))}%`;
      this.els.outputValue.textContent = this.formatDb(outDb);
    },

    reset() {
      this.els.enabled.checked = false;
      this.els.overdrive.value = 0;
      this.els.distortion.value = 0;
      this.els.fuzz.value = 0;
      this.els.output.value = this.settings ? this.settings.output.defaultDb : 0;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
