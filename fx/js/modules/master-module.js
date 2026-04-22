(function () {
  const module = {
    id: 'master',
    input: null,
    output: null,
    gainNode: null,
    analyser: null,
    meterData: null,
    meterAnimFrame: null,
    peakHoldDb: -60,
    lastPeakTs: 0,
    els: {},

    dbToGain(db) {
      if (db <= -60) return 0;
      return Math.pow(10, db / 20);
    },

    gainToDb(gain) {
      if (gain <= 0.000001) return -60;
      return 20 * Math.log10(gain);
    },

    clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    },

    formatDb(db) {
      if (db <= -60) return '-60 dB';
      return `${db > 0 ? '+' : ''}${Math.round(db)} dB`;
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

        <div class="master-section">
          <div class="slider-row">
            <label for="master-output">Level</label>
            <input
              type="range"
              id="master-output"
              min="-60"
              max="15"
              step="1"
              value="0"
            />
            <span id="master-output-value">0 dB</span>
          </div>

          <div class="master-meter-wrap">
            <div class="master-meter-ruler">
              <span style="left: 0%;">-60</span>
              <span style="left: 33.3333%;">-40</span>
              <span style="left: 66.6667%;">-20</span>
              <span style="left: 83.3333%;">-10</span>
              <span style="left: 91.6667%;">-5</span>
              <span style="left: 100%;">0</span>
            </div>

            <div class="master-meter" id="master-meter">
              <div class="meter-zone zone-green"></div>
              <div class="meter-zone zone-yellow"></div>
              <div class="meter-zone zone-orange"></div>
              <div class="meter-zone zone-red"></div>

              <div class="meter-overlay" id="master-meter-overlay"></div>
              <div class="meter-peak" id="master-meter-peak"></div>
            </div>

            <div class="master-meter-readout">
              Output: <span id="master-meter-readout">-60 dB</span>
            </div>
          </div>
        </div>
      `;

      this.els.card = card;
      this.els.output = card.querySelector('#master-output');
      this.els.outputValue = card.querySelector('#master-output-value');
      this.els.meter = card.querySelector('#master-meter');
      this.els.meterOverlay = card.querySelector('#master-meter-overlay');
      this.els.meterPeak = card.querySelector('#master-meter-peak');
      this.els.meterReadout = card.querySelector('#master-meter-readout');

      this.els.output.addEventListener('input', () => {
        const db = Number(this.els.output.value);
        this.setDb(db);
      });

      return card;
    },

    setDb(db) {
      const gain = this.dbToGain(db);
      this.gainNode.gain.value = gain;

      if (this.els.outputValue) {
        this.els.outputValue.textContent = this.formatDb(db);
      }
    },

    getMeterDb() {
      if (!this.analyser || !this.meterData) return -60;

      this.analyser.getFloatTimeDomainData(this.meterData);

      let peak = 0;
      for (let i = 0; i < this.meterData.length; i++) {
        const abs = Math.abs(this.meterData[i]);
        if (abs > peak) peak = abs;
      }

      if (peak < 0.000001) return -60;

      const db = 20 * Math.log10(peak);
      return this.clamp(db, -60, 6);
    },

    dbToMeterPercent(db) {
      const clamped = this.clamp(db, -60, 0);
      return ((clamped + 60) / 60) * 100;
    },

    updateMeterVisual(db) {
      if (!this.els.meterOverlay || !this.els.meterReadout || !this.els.meterPeak) return;

      const now = performance.now();
      const visibleDb = this.clamp(db, -60, 0);
      const percent = this.dbToMeterPercent(visibleDb);

      this.els.meterOverlay.style.width = `${100 - percent}%`;
      this.els.meterReadout.textContent = `${Math.round(visibleDb)} dB`;

      if (db > this.peakHoldDb || now - this.lastPeakTs > 1200) {
        this.peakHoldDb = visibleDb;
        this.lastPeakTs = now;
      } else {
        this.peakHoldDb = Math.max(visibleDb, this.peakHoldDb - 0.35);
      }

      const peakPercent = this.dbToMeterPercent(this.peakHoldDb);
      this.els.meterPeak.style.left = `${peakPercent}%`;
    },

    startMeter() {
      const tick = () => {
        const db = this.getMeterDb();
        this.updateMeterVisual(db);
        this.meterAnimFrame = requestAnimationFrame(tick);
      };

      if (this.meterAnimFrame) {
        cancelAnimationFrame(this.meterAnimFrame);
      }

      tick();
    },

    stopMeter() {
      if (this.meterAnimFrame) {
        cancelAnimationFrame(this.meterAnimFrame);
        this.meterAnimFrame = null;
      }
    },

    init() {
      this.createNodes();
      const card = this.createUI();
      this.startMeter();
      return card;
    }
  };

  AppModules.register(module);
})();
