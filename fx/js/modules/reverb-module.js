(function () {
  const module = {
    id: 'reverb',
    input: null,
    convolver: null,
    wet: null,
    dry: null,
    output: null,
    toneFilter: null,
    impulseCache: new Map(),
    els: {},

    generateImpulse(seconds) {
      const ctx = AppState.audioContext;
      const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
      const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          const t = i / length;
          const decay = Math.pow(1 - t, 2.8);
          data[i] = (Math.random() * 2 - 1) * decay;
        }
      }

      return buffer;
    },

    ensureImpulse(seconds) {
      const key = seconds.toFixed(1);
      if (!this.impulseCache.has(key)) {
        this.impulseCache.set(key, this.generateImpulse(seconds));
      }
      this.convolver.buffer = this.impulseCache.get(key);
    },

    toneToDb(value) {
      const clamped = Math.max(0, Math.min(100, value));
      return (clamped / 100) * 20 - 10;
    },

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';
      card.innerHTML = `
        <h3>
          Reverb
          <label class="inline-toggle">
            <input type="checkbox" id="reverb-enabled" />
            On
          </label>
        </h3>
        <div class="controls">
          <div>
            <label for="reverb-length">Reverb Length</label>
            <div class="slider-row">
              <input type="range" id="reverb-length" min="0.2" max="6" step="0.1" value="2.5" />
              <div class="value" id="reverb-length-value"></div>
            </div>
          </div>
          <div>
            <label for="reverb-wet">Dry / Wet</label>
            <div class="slider-row">
              <input type="range" id="reverb-wet" min="0" max="100" step="1" value="25" />
              <div class="value" id="reverb-wet-value"></div>
            </div>
          </div>
          <div>
            <label for="reverb-tone">Brightness</label>
            <div class="slider-row">
              <input type="range" id="reverb-tone" min="0" max="100" step="1" value="50" />
              <div class="value" id="reverb-tone-value"></div>
            </div>
          </div>
        </div>
      `;
      return card;
    },

    init() {
      const ctx = AppState.audioContext;

      this.input = ctx.createGain();
      this.convolver = ctx.createConvolver();
      this.toneFilter = ctx.createBiquadFilter();
      this.wet = ctx.createGain();
      this.dry = ctx.createGain();
      this.output = ctx.createGain();

      this.toneFilter.type = 'highshelf';
      this.toneFilter.frequency.value = 500;
      this.toneFilter.gain.value = 0;

      this.input.connect(this.dry);
      this.dry.connect(this.output);

      this.input.connect(this.convolver);
      this.convolver.connect(this.toneFilter);
      this.toneFilter.connect(this.wet);
      this.wet.connect(this.output);

      this.els.enabled = document.getElementById('reverb-enabled');
      this.els.length = document.getElementById('reverb-length');
      this.els.lengthValue = document.getElementById('reverb-length-value');
      this.els.wet = document.getElementById('reverb-wet');
      this.els.wetValue = document.getElementById('reverb-wet-value');
      this.els.tone = document.getElementById('reverb-tone');
      this.els.toneValue = document.getElementById('reverb-tone-value');

      this.els.enabled.addEventListener('input', () => this.update());
      this.els.length.addEventListener('input', () => this.update());
      this.els.wet.addEventListener('input', () => this.update());
      this.els.tone.addEventListener('input', () => this.update());

      this.update();
    },

    connect(inputNode) {
      inputNode.connect(this.input);
      return this.output;
    },

    update() {
      const enabled = this.els.enabled.checked;
      const length = Number(this.els.length.value);
      const wetPercent = enabled ? Number(this.els.wet.value) : 0;
      const wet = wetPercent / 100;
      const dry = 1 - wet;
      const tone = Number(this.els.tone.value);
      const toneDb = this.toneToDb(tone);

      this.ensureImpulse(length);
      this.wet.gain.value = wet;
      this.dry.gain.value = enabled ? dry : 1;
      this.toneFilter.gain.value = toneDb;

      this.els.lengthValue.textContent = `${length.toFixed(1)} s`;
      this.els.wetValue.textContent = `${Math.round(wetPercent)}% wet`;
      this.els.toneValue.textContent = `${toneDb >= 0 ? '+' : ''}${toneDb.toFixed(1)} dB`;
    },

    reset() {
      this.els.enabled.checked = false;
      this.els.length.value = 2.5;
      this.els.wet.value = 25;
      this.els.tone.value = 50;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
