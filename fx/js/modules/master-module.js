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
    },

    createUI() {
      const card = document.createElement('div');
      card.className = 'transport-master';

      card.innerHTML = `
        <h3>Master Output</h3>

        <div class="master-top-row">
          <label for="master-slider">Level</label>
          <input
            type="range"
            id="master-slider"
            min="-60"
            max="15"
            step="1"
            value="0"
          />
          <div class="master-value" id="master-value">0 dB</div>
        </div>

        <div class="meter-wrap">
          <div class="meter-ruler">
            <span style="left:0%">-60</span>
            <span style="left:33.3333%">-40</span>
            <span style="left:66.6667%">-20</span>
            <span style="left:83.3333%">-10</span>
            <span style="left:91.6667%">-5</span>
            <span style="left:100%">0</span>
          </div>

          <div class="master-meter">
            <div class="zone green"></div>
            <div class="zone yellow"></div>
            <div class="zone orange"></div>
            <div class="zone red"></div>
            <div class="overlay" id="master-overlay"></div>
            <div class="peak" id="master-peak"></div>
          </div>

          <div class="meter-readout">
            Output: <span id="master-meter-db">-60 dB</span>
          </div>
        </div>
      `;

      this.els.slider = card.querySelector('#master-slider');
      this.els.value = card.querySelector('#master-value');
      this.els.overlay = card.querySelector('#master-overlay');
      this.els.peak = card.querySelector('#master-peak');
      this.els.db = card.querySelector('#master-meter-db');

      this.els.slider.addEventListener('input', () => {
        const db = Number(this.els.slider.value);
        this.setDb(db);
      });

      return card;
    },

    init() {
      this.createNodes();
      this.setDb(0);
      this.startMeter();
    },

    setDb(db) {
      if (!this.gainNode) return;

      this.gainNode.gain.value = this.dbToGain(db);

      if (this.els.value) {
        this.els.value.textContent = `${db > 0 ? '+' : ''}${db} dB`;
      }
    },

    getDb() {
      if (!this.analyser || !this.meterData) return -60;

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

        if (this.els.overlay) {
          this.els.overlay.style.width = `${100 - pct}%`;
        }

        if (this.els.db) {
          this.els.db.textContent = `${Math.round(visibleDb)} dB`;
        }

        peakHold = Math.max(visibleDb, peakHold - 0.4);
        const peakPct = this.dbToPercent(peakHold);

        if (this.els.peak) {
          this.els.peak.style.left = `${peakPct}%`;
        }

        this.meterAnim = requestAnimationFrame(tick);
      };

      tick();
    }
  };

  ModuleRegistry.register(module);
})();
