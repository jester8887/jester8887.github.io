(function () {
  const module = {
    id: 'master',

    input: null,
    output: null,
    gainNode: null,
    analyser: null,
    meterData: null,
    meterAnim: null,

    els: {},

    dbToGain(db) {
      if (db <= -60) return 0;
      return Math.pow(10, db / 20);
    },

    createNodes() {
      const ctx = AppState.audioContext;

      this.input = ctx.createGain();
      this.gainNode = ctx.createGain();
      this.analyser = ctx.createAnalyser();
      this.output = ctx.createGain();

      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.85;

      this.meterData = new Float32Array(this.analyser.fftSize);

      this.input.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.output);

      this.setDb(0);
    },

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card master-card';

      card.innerHTML = `
        <h3>Master Output</h3>

        <div class="slider-row">
          <label>Level</label>
          <input type="range" id="master-slider" min="-60" max="15" step="1" value="0">
          <span id="master-value">0 dB</span>
        </div>

        <div class="meter-wrap">
          <div class="meter-ruler">
            <span style="left:0%">-60</span>
            <span style="left:33.3%">-40</span>
            <span style="left:66.6%">-20</span>
            <span style="left:83.3%">-10</span>
            <span style="left:91.6%">-5</span>
            <span style="left:100%">0</span>
          </div>

          <div class="meter" id="meter">
            <div class="zone green"></div>
            <div class="zone yellow"></div>
            <div class="zone orange"></div>
            <div class="zone red"></div>

            <div class="overlay" id="overlay"></div>
            <div class="peak" id="peak"></div>
          </div>

          <div class="meter-readout">
            <span id="meter-db">-60 dB</span>
          </div>
        </div>
      `;

      this.els.slider = card.querySelector('#master-slider');
      this.els.value = card.querySelector('#master-value');
      this.els.overlay = card.querySelector('#overlay');
      this.els.peak = card.querySelector('#peak');
      this.els.db = card.querySelector('#meter-db');

      this.els.slider.addEventListener('input', () => {
        const db = Number(this.els.slider.value);
        this.setDb(db);
      });

      return card;
    },

    setDb(db) {
      this.gainNode.gain.value = this.dbToGain(db);
      this.els.value.textContent = `${db > 0 ? '+' : ''}${db} dB`;
    },

    getDb() {
      this.analyser.getFloatTimeDomainData(this.meterData);

      let peak = 0;
      for (let i = 0; i < this.meterData.length; i++) {
        const v = Math.abs(this.meterData[i]);
        if (v > peak) peak = v;
      }

      if (peak < 0.000001) return -60;

      const db = 20 * Math.log10(peak);
      return Math.max(-60, Math.min(6, db));
    },

    dbToPercent(db) {
      const clamped = Math.max(-60, Math.min(0, db));
      return ((clamped + 60) / 60) * 100;
    },

    startMeter() {
      let peakHold = -60;

      const tick = () => {
        const db = this.getDb();
        const visibleDb = Math.max(-60, Math.min(0, db));

        const pct = this.dbToPercent(visibleDb);

        this.els.overlay.style.width = `${100 - pct}%`;
        this.els.db.textContent = `${Math.round(visibleDb)} dB`;

        peakHold = Math.max(visibleDb, peakHold - 0.4);
        const peakPct = this.dbToPercent(peakHold);
        this.els.peak.style.left = `${peakPct}%`;

        this.meterAnim = requestAnimationFrame(tick);
      };

      tick();
    },

    init() {
      this.createNodes();
      const ui = this.createUI();
      this.startMeter();
      return ui;
    }
  };

  AppModules.register(module);
})();
