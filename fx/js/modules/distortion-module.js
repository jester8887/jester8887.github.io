(function () {
  const module = {
    id: 'distortion',
    node: null,
    output: null,
    els: {},

    makeCurve(amount) {
      const samples = 44100;
      const curve = new Float32Array(samples);
      const deg = Math.PI / 180;
      const k = amount;

      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = k === 0 ? x : ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }

      return curve;
    },

    createUI() {
      const card = document.createElement('div');
      card.className = 'effect-card';
      card.innerHTML = `
        <h3>
          Distortion
          <label class="inline-toggle">
            <input type="checkbox" id="distortion-enabled" />
            On
          </label>
        </h3>
        <div class="controls">
          <div>
            <label for="distortion-drive">Drive</label>
            <div class="slider-row">
              <input type="range" id="distortion-drive" min="0" max="1000" step="1" value="0" />
              <div class="value" id="distortion-drive-value"></div>
            </div>
          </div>
          <div>
            <label for="distortion-output">Output Gain</label>
            <div class="slider-row">
              <input type="range" id="distortion-output" min="0" max="1.5" step="0.01" value="1" />
              <div class="value" id="distortion-output-value"></div>
            </div>
          </div>
        </div>
      `;
      return card;
    },

    init() {
      this.node = AppState.audioContext.createWaveShaper();
      this.output = AppState.audioContext.createGain();
      this.node.oversample = '4x';

      this.els.enabled = document.getElementById('distortion-enabled');
      this.els.drive = document.getElementById('distortion-drive');
      this.els.driveValue = document.getElementById('distortion-drive-value');
      this.els.output = document.getElementById('distortion-output');
      this.els.outputValue = document.getElementById('distortion-output-value');

      this.els.enabled.addEventListener('input', () => this.update());
      this.els.drive.addEventListener('input', () => this.update());
      this.els.output.addEventListener('input', () => this.update());

      this.update();
    },

    connect(inputNode) {
      if (!this.els.enabled.checked) return inputNode;
      inputNode.connect(this.node);
      this.node.connect(this.output);
      return this.output;
    },

    update() {
      const drive = this.els.enabled.checked ? Number(this.els.drive.value) : 0;
      const out = this.els.enabled.checked ? Number(this.els.output.value) : 1;

      this.node.curve = this.makeCurve(drive);
      this.output.gain.value = out;

      this.els.driveValue.textContent = String(drive);
      this.els.outputValue.textContent = out.toFixed(2);
    },

    reset() {
      this.els.enabled.checked = false;
      this.els.drive.value = 0;
      this.els.output.value = 1;
      this.update();
    }
  };

  ModuleRegistry.register(module);
})();
