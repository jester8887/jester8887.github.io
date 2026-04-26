(function () {
  const module = {
    id: 'compressor',
    input: null,
    compressor: null,
    bypassGain: null,
    wetGain: null,
    output: null,
    meterAnimationId: null,
    els: {},

    dbToGain(db) {
      return Math.pow(10, db / 20);
    },

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';
      card.innerHTML = `
        <style>
          .compressor-gr-wrap {
            margin-bottom: 14px;
          }

          .compressor-gr-label-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            margin-bottom: 6px;
          }

          .compressor-gr-readout {
            font-size: 12px;
            color: var(--muted);
            min-width: 56px;
            text-align: right;
          }

          .compressor-gr-meter {
            position: relative;
            height: 14px;
            border: 1px solid var(--border);
            border-radius: 999px;
            background: #0f1115;
            overflow: hidden;
          }

          .compressor-gr-fill {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 0%;
            background: linear-gradient(90deg, var(--danger), var(--warn), var(--accent));
            transition: width 0.06s linear;
          }

          .compressor-gr-scale {
            position: relative;
            height: 14px;
            margin-top: 4px;
            font-size: 10px;
            color: var(--muted);
          }

          .compressor-gr-scale span {
            position: absolute;
            transform: translateX(-50%);
          }

          .compressor-gr-scale span:first-child {
            left: 0%;
          }

          .compressor-gr-scale span:nth-child(2) {
            left: 25%;
          }

          .compressor-gr-scale span:nth-child(3) {
            left: 50%;
          }

          .compressor-gr-scale span:nth-child(4) {
            left: 75%;
          }

          .compressor-gr-scale span:last-child {
            left: 100%;
            transform: translateX(-100%);
          }
        </style>

        <h3>
          Compressor
          <label class="inline-toggle">
            <input type="checkbox" id="compressor-enabled" />
            On
          </label>
        </h3>

        <div class="compressor-gr-wrap">
          <div class="compressor-gr-label-row">
            <label>Gain Reduction</label>
            <div class="compressor-gr-readout" id="compressor-gr-readout">0.0 dB</div>
          </div>

          <div class="compressor-gr-meter">
            <div class="compressor-gr-fill" id="compressor-gr-fill"></div>
          </div>

          <div class="compressor-gr-scale">
            <span>-40</span>
            <span>-30</span>
            <span>-20</span>
            <span>-10</span>
            <span>0 dB</span>
          </div>
        </div>

        <div class="controls">
          <div>
            <label for="compressor-threshold">Threshold</label>
            <div class="slider-row">
              <input type="range" id="compressor-threshold" min="-100" max="0" step="1" value="-24" />
              <div class="value" id="compressor-threshold-value"></div>
            </div>
          </div>

          <div>
            <label for="compressor-ratio">Ratio</label>
            <div class="slider-row">
              <input type="range" id="compressor-ratio" min="1" max="20" step="0.1" value="4" />
              <div class="value" id="compressor-ratio-value"></div>
            </div>
          </div>

          <div>
            <label for="compressor-attack">Attack</label>
            <div class="slider-row">
              <input type="range" id="compressor-attack" min="0" max="1" step="0.001" value="0.003" />
              <div class="value" id="compressor-attack-value"></div>
            </div>
          </div>

          <div>
            <label for="compressor-release">Release</label>
            <div class="slider-row">
              <input type="range" id="compressor-release" min="0" max="1" step="0.001" value="0.25" />
              <div class="value" id="compressor-release-value"></div>
            </div>
          </div>

          <div>
            <label for="compressor-makeup">Makeup Gain</label>
            <div class="slider-row">
              <input type="range" id="compressor-makeup" min="-20" max="20" step="0.1" value="0" />
              <div class="value" id="compressor-makeup-value"></div>
            </div>
          </div>
        </div>
      `;
      return card;
    },

    init() {
      const ctx = AppState.audioContext;

      this.input = ctx.createGain();
      this.compressor = ctx.createDynamicsCompressor();
      this.bypassGain = ctx.createGain();
      this.wetGain = ctx.createGain();
      this.output = ctx.createGain();

      this.input.connect(this.bypassGain);
      this.bypassGain.connect(this.output);

      this.input.connect(this.compressor);
      this.compressor.connect(this.wetGain);
      this.wetGain.connect(this.output);

      this.els.enabled = document.getElementById('compressor-enabled');
      this.els.grFill = document.getElementById('compressor-gr-fill');
      this.els.grReadout = document.getElementById('compressor-gr-readout');

      this.els.threshold = document.getElementById('compressor-threshold');
      this.els.thresholdValue = document.getElementById('compressor-threshold-value');

      this.els.ratio = document.getElementById('compressor-ratio');
      this.els.ratioValue = document.getElementById('compressor-ratio-value');

      this.els.attack = document.getElementById('compressor-attack');
      this.els.attackValue = document.getElementById('compressor-attack-value');

      this.els.release = document.getElementById('compressor-release');
      this.els.releaseValue = document.getElementById('compressor-release-value');

      this.els.makeup = document.getElementById('compressor-makeup');
      this.els.makeupValue = document.getElementById('compressor-makeup-value');

      this.els.enabled.addEventListener('change', () => this.update());
      this.els.threshold.addEventListener('input', () => this.update());
      this.els.ratio.addEventListener('input', () => this.update());
      this.els.attack.addEventListener('input', () => this.update());
      this.els.release.addEventListener('input', () => this.update());
      this.els.makeup.addEventListener('input', () => this.update());

      this.update();
      this.startGainReductionMeter();
    },

    connect(inputNode) {
      inputNode.connect(this.input);
      return this.output;
    },

    startGainReductionMeter() {
      const tick = () => {
        this.updateGainReductionMeter();
        this.meterAnimationId = requestAnimationFrame(tick);
      };

      tick();
    },

    updateGainReductionMeter() {
      if (!this.els.grFill || !this.els.grReadout || !this.compressor) return;

      if (!this.els.enabled.checked) {
        this.els.grFill.style.width = "0%";
        this.els.grReadout.textContent = "0.0 dB";
        return;
      }

      const rawReduction = Number(this.compressor.reduction) || 0;
      const reductionDb = Math.max(-40, Math.min(0, rawReduction));
      const amount = Math.abs(reductionDb);
      const width = (amount / 40) * 100;

      this.els.grFill.style.width = `${width}%`;
      this.els.grReadout.textContent = amount > 0.05
        ? `${reductionDb.toFixed(1)} dB`
        : "0.0 dB";
    },

    update() {
      const enabled = this.els.enabled.checked;
      const threshold = Number(this.els.threshold.value);
      const ratio = Number(this.els.ratio.value);
      const attack = Number(this.els.attack.value);
      const release = Number(this.els.release.value);
      const makeupDb = Number(this.els.makeup.value);
      const makeupGain = this.dbToGain(makeupDb);

      this.compressor.threshold.value = threshold;
      this.compressor.ratio.value = ratio;
      this.compressor.attack.value = attack;
      this.compressor.release.value = release;

      this.bypassGain.gain.value = enabled ? 0 : 1;
      this.wetGain.gain.value = enabled ? makeupGain : 0;

      this.els.thresholdValue.textContent = `${Math.round(threshold)} dB`;
      this.els.ratioValue.textContent = `${ratio.toFixed(1)}:1`;
      this.els.attackValue.textContent = `${attack.toFixed(3)} s`;
      this.els.releaseValue.textContent = `${release.toFixed(3)} s`;
      this.els.makeupValue.textContent = `${makeupDb.toFixed(1)} dB`;

      this.updateGainReductionMeter();
    },

    reset() {
      this.els.enabled.checked = false;
      this.els.threshold.value = -24;
      this.els.ratio.value = 4;
      this.els.attack.value = 0.003;
      this.els.release.value = 0.25;
      this.els.makeup.value = 0;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
