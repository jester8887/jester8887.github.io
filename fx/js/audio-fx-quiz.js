(function () {
  const QUIZ_BANK_URL = window.FX_QUIZ_BANK_URL || "json/audio_fx_quiz_bank.json";

  const DEFAULT_PROMPT =
    window.FX_QUIZ_DEFAULT_PROMPT ||
    "Listen to the processed audio. Which effect or processing module is active?";

  const ANSWER_CHOICES = [
    { id: "lowpass", label: "Low-Pass Filter", category: "eq" },
    { id: "highpass", label: "High-Pass Filter", category: "eq" },
    { id: "bandpass", label: "Band-Pass Filter", category: "eq" },
    { id: "notch", label: "Band-Reject Filter", category: "eq" },
    { id: "lowshelf-boost", label: "Low Shelf Boost", category: "eq" },
    { id: "lowshelf-attenuate", label: "Low Shelf Attenuate", category: "eq" },
    { id: "highshelf-boost", label: "High Shelf Boost", category: "eq" },
    { id: "highshelf-attenuate", label: "High Shelf Attenuate", category: "eq" },

    { id: "compressor", label: "Compressor", category: "dynamics" },
    { id: "noise-gate", label: "Noise Gate", category: "dynamics" },

    { id: "overdrive", label: "Overdrive", category: "distortion" },
    { id: "distortion", label: "Distortion", category: "distortion" },
    { id: "fuzz", label: "Fuzz", category: "distortion" },

    { id: "feed-forward-delay", label: "Feed-Forward Delay", category: "delayReverb" },
    { id: "feedback-delay", label: "Feedback Delay", category: "delayReverb" },
    { id: "reverb", label: "Reverb", category: "delayReverb" },

    { id: "tremolo", label: "Tremolo", category: "modulation" },
    { id: "vibrato", label: "Vibrato", category: "modulation" },
    { id: "chorus", label: "Chorus", category: "modulation" },
    { id: "flanger", label: "Flanger", category: "modulation" }
  ];

  const MODULE_TITLES = {
    lowpass: "Low-Pass Filter",
    highpass: "High-Pass Filter",
    bandpass: "Band-Pass Filter",
    notch: "Band-Reject Filter",
    lowshelf: "Low Shelf",
    highshelf: "High Shelf",
    compressor: "Compressor",
    distortion: "Analog Drive Stack",
    delay: "Delay",
    reverb: "Reverb",
    tremolo: "Tremolo",
    vibrato: "Vibrato",
    chorus: "Chorus",
    flanger: "Flanger",
    "noise-gate": "Noise Gate"
  };

  const ENABLE_SELECTORS = {
    lowpass: "#lowpass-enabled",
    highpass: "#highpass-enabled",
    bandpass: "#bandpass-enabled",
    notch: "#notch-enabled",
    lowshelf: "#lowshelf-enabled",
    highshelf: "#highshelf-enabled",
    compressor: "#compressor-enabled",
    distortion: "#distortion-enabled",
    delay: "#delay-enabled",
    reverb: "#reverb-enabled",
    tremolo: "#tremolo-enabled",
    vibrato: "#vibrato-enabled",
    chorus: "#chorus-enabled",
    flanger: "#flanger-enabled",
    "noise-gate": "#noise-gate-enabled"
  };

  const PARAM_SELECTORS = {
    lowpass: {
      f: "#lowpass-freq"
    },
    highpass: {
      f: "#highpass-freq"
    },
    bandpass: {
      f: "#bandpass-freq",
      q: "#bandpass-q"
    },
    notch: {
      f: "#notch-freq",
      q: "#notch-q"
    },
    lowshelf: {
      f: "#lowshelf-freq",
      g: "#lowshelf-gain"
    },
    highshelf: {
      f: "#highshelf-freq",
      g: "#highshelf-gain"
    },
    compressor: {
      th: "#compressor-threshold",
      ra: "#compressor-ratio",
      r: "#compressor-ratio",
      a: "#compressor-attack",
      rel: "#compressor-release",
      mk: "#compressor-makeup",
      m: "#compressor-makeup"
    },
    distortion: {
      od: "#distortion-overdrive",
      ds: "#distortion-distortion",
      fz: "#distortion-fuzz",
      out: "#distortion-output"
    },
    delay: {
      t: "#delay-time",
      fb: "#delay-feedback",
      w: "#delay-wet"
    },
    reverb: {
      len: "#reverb-length",
      l: "#reverb-length",
      w: "#reverb-wet",
      tone: "#reverb-tone"
    },
    tremolo: {
      r: "#tremolo-rate",
      d: "#tremolo-depth"
    },
    vibrato: {
      r: "#vibrato-rate",
      d: "#vibrato-depth"
    },
    chorus: {
      r: "#chorus-rate",
      d: "#chorus-depth",
      mix: "#chorus-mix"
    },
    flanger: {
      r: "#flanger-rate",
      del: "#flanger-delay",
      dly: "#flanger-delay",
      d: "#flanger-depth",
      fb: "#flanger-feedback",
      mix: "#flanger-mix",
      tone: "#flanger-tone"
    },
    "noise-gate": {
      th: "#noise-gate-threshold",
      rel: "#noise-gate-release",
      floor: "#noise-gate-floor"
    }
  };

  const Quiz = {
    bank: [],
    pool: [],
    activeBank: [],
    currentItem: null,
    busy: false,
    els: {},

    async init() {
      this.cacheEls();
      this.renderChoices();
      this.bindUI();
      this.setControlsEnabled(false);
      this.setStatus("Preparing quiz...");

      try {
        await this.waitForWorkshopReady();
        await this.loadBank();

        this.activeBank = this.getFilteredBank();
        this.pool = [...this.activeBank];

        this.renderChoices();

        if (!this.pool.length) {
          this.setFeedback("No quiz examples were found for the selected FX filter.", "incorrect");
          this.setStatus("No examples found.");
          this.updateProgress();
          return;
        }

        await this.loadNextQuestion();
      } catch (error) {
        console.error(error);
        this.setFeedback(
          "The quiz could not load. Check that json/audio_fx_quiz_bank.json and the audio files are uploaded in the correct folders.",
          "incorrect"
        );
        this.setStatus("Quiz load failed.");
      }
    },

    cacheEls() {
      this.els.progress = document.getElementById("quizProgress");
      this.els.status = document.getElementById("quizStatus");
      this.els.prompt = document.getElementById("quizPrompt");
      this.els.source = document.getElementById("quizSource");
      this.els.playClean = document.getElementById("quizPlayCleanBtn");
      this.els.playEffect = document.getElementById("quizPlayEffectBtn");
      this.els.stop = document.getElementById("quizStopBtn");
      this.els.form = document.getElementById("quizForm");
      this.els.choices = document.getElementById("answerChoices");
      this.els.submit = document.getElementById("submitAnswerBtn");
      this.els.next = document.getElementById("nextQuestionBtn");
      this.els.feedback = document.getElementById("quizFeedback");
    },

    bindUI() {
      this.els.playClean.addEventListener("click", () => this.playClean());
      this.els.playEffect.addEventListener("click", () => this.playEffect());
      this.els.stop.addEventListener("click", () => this.stopAudio());
      this.els.next.addEventListener("click", () => this.loadNextQuestion());

      this.els.form.addEventListener("submit", (event) => {
        event.preventDefault();
        this.checkAnswer();
      });

      window.addEventListener("fxQuizGenerateRequested", () => {
        this.generateFilteredQuiz();
      });
    },

    renderChoices() {
      this.els.choices.innerHTML = "";

      const selectedCategories = this.getSelectedCategories();

      const visibleChoices = ANSWER_CHOICES.filter((choice) => {
        return selectedCategories.includes(choice.category);
      });

      visibleChoices.forEach((choice) => {
        const label = document.createElement("label");
        label.className = "answer-option";
        label.dataset.category = choice.category;

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "fxAnswer";
        input.value = choice.id;

        const span = document.createElement("span");
        span.textContent = choice.label;

        label.appendChild(input);
        label.appendChild(span);
        this.els.choices.appendChild(label);
      });
    },

    async waitForWorkshopReady() {
      const started = Date.now();

      while (Date.now() - started < 10000) {
        const ready = Boolean(
          window.AppState &&
          window.AudioEngine &&
          window.ModuleRegistry &&
          window.LibraryManager &&
          Array.isArray(AppState.modules) &&
          AppState.modules.length &&
          Array.isArray(AppState.library) &&
          AppState.library.length &&
          document.querySelector("#effectsContainer .effect-card")
        );

        if (ready) return;
        await this.delay(100);
      }

      throw new Error("Workshop engine did not finish loading.");
    },

    async loadBank() {
      const response = await fetch(QUIZ_BANK_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load quiz bank.");

      const data = await response.json();
      const items = Array.isArray(data) ? data : data.items;

      this.bank = (items || [])
        .map((item, index) => this.normalizeItem(item, index))
        .filter(Boolean);
    },

    normalizeItem(item, index) {
      if (!item) return null;

      if (item.preset && item.preset.activeModule) {
        return this.normalizeLegacyItem(item, index);
      }

      if (item.fx && item.s) {
        return this.normalizeCompactItem(item, index);
      }

      return null;
    },

    normalizeLegacyItem(item, index) {
      const preset = item.preset;
      const answer = this.getAnswerForLegacyPreset(preset);
      const source = preset.source || item.source || {};

      return {
        id: item.id || this.makeId(index),
        prompt: item.prompt || DEFAULT_PROMPT,
        sourceTitle: source.title || "Unknown source",
        sourceMeta: source.meta || "",
        fx: preset.activeModule.id,
        compactParams: this.paramsFromLegacyPreset(preset),
        masterOutput: this.masterFromLegacyPreset(preset),
        preset,
        correctAnswerId: answer.id,
        correctAnswerLabel: answer.label,
        correctAnswerCategory: answer.category || this.getCategoryForAnswerId(answer.id)
      };
    },

    normalizeCompactItem(item, index) {
      const fx = String(item.fx || "").trim();
      const answer = this.getAnswerForCompactItem(item);

      return {
        id: item.id || this.makeId(index),
        prompt: item.prompt || DEFAULT_PROMPT,
        sourceTitle: item.s || item.src || "Unknown source",
        sourceMeta: item.m || item.meta || "",
        fx,
        compactParams: item.p || {},
        masterOutput: this.readMasterOutput(item),
        original: item,
        correctAnswerId: answer.id,
        correctAnswerLabel: answer.label,
        correctAnswerCategory: answer.category || this.getCategoryForAnswerId(answer.id)
      };
    },

    makeId(index) {
      return `fxid-${String(index + 1).padStart(3, "0")}`;
    },

    readMasterOutput(item) {
      if (item.o !== undefined) return item.o;
      if (item.p && item.p.master !== undefined) return item.p.master;
      return 0;
    },

    generateFilteredQuiz() {
      this.stopAudio();
      this.clearAnswerSelection();

      this.activeBank = this.getFilteredBank();
      this.pool = [...this.activeBank];
      this.currentItem = null;

      this.renderChoices();

      if (!this.activeBank.length) {
        this.setControlsEnabled(false);
        this.els.next.disabled = true;
        this.els.submit.disabled = true;
        this.els.prompt.textContent = "No matching examples.";
        this.els.source.textContent = "Choose a different FX filter.";
        this.setFeedback("No quiz examples match the selected FX filter.", "incorrect");
        this.setStatus("Adjust FX filter.");
        this.updateProgress();
        return;
      }

      this.setFeedback("New filtered quiz generated.", "");
      this.loadNextQuestion();
    },

    getFilteredBank() {
      const selectedCategories = this.getSelectedCategories();

      if (!selectedCategories.length) {
        return [];
      }

      return this.bank.filter((item) => {
        return selectedCategories.includes(item.correctAnswerCategory);
      });
    },

    getSelectedCategories() {
      if (typeof window.getSelectedFxQuizCategories === "function") {
        return window.getSelectedFxQuizCategories();
      }

      return ["eq", "modulation", "dynamics", "delayReverb", "distortion"];
    },

    getCategoryForAnswerId(answerId) {
      const choice = this.choice(answerId);
      return choice?.category || "";
    },

    async loadNextQuestion() {
      this.stopAudio();
      this.clearAnswerSelection();
      this.els.next.disabled = true;
      this.els.submit.disabled = false;

      if (!this.pool.length) {
        this.currentItem = null;
        this.setControlsEnabled(false);
        this.els.prompt.textContent = "Quiz complete.";
        this.els.source.textContent = "You identified every example correctly.";
        this.setFeedback(
          "Great work. Click Generate Quiz to start again with the selected filter, or refresh the page.",
          "correct"
        );
        this.updateProgress();
        this.setStatus("Complete");
        return;
      }

      const index = Math.floor(Math.random() * this.pool.length);
      this.currentItem = this.pool[index];

      this.els.prompt.textContent = this.currentItem.prompt || DEFAULT_PROMPT;
      this.els.source.textContent = `Source: ${this.currentItem.sourceTitle || "Unknown source"}`;
      this.setFeedback("Use Play Clean and Play Effect as many times as needed, then submit your answer.", "");
      this.updateProgress();
      this.setStatus("Example ready");
      this.setControlsEnabled(true);

      await this.ensureSourceLoaded(this.currentItem);
      this.applyCleanState(this.currentItem);
    },

    async playClean() {
      if (!this.currentItem || this.busy) return;

      this.busy = true;
      this.setStatus("Playing clean audio...");

      try {
        await this.ensureSourceLoaded(this.currentItem);
        this.applyCleanState(this.currentItem);
        await this.resumeAudioContext();
        AudioEngine.play();
      } finally {
        this.busy = false;
      }
    },

    async playEffect() {
      if (!this.currentItem || this.busy) return;

      this.busy = true;
      this.setStatus("Playing effect preset...");

      try {
        await this.ensureSourceLoaded(this.currentItem);
        this.applyEffectState(this.currentItem);
        await this.resumeAudioContext();
        AudioEngine.play();
      } finally {
        this.busy = false;
      }
    },

    stopAudio() {
      if (window.AudioEngine) AudioEngine.stop();
      this.setStatus(this.currentItem ? "Stopped" : "Ready");
    },

    async ensureSourceLoaded(item) {
      const sourceTitle = item.sourceTitle || item.preset?.source?.title;
      if (!sourceTitle) return;

      const alreadyLoaded = AppState.selectedItem && AppState.selectedItem.title === sourceTitle;
      if (alreadyLoaded && AppState.audioBuffer) return;

      const libraryItem = AppState.library.find((candidate) => candidate.title === sourceTitle);
      if (!libraryItem) throw new Error(`Source not found: ${sourceTitle}`);

      await LibraryManager.loadItem(libraryItem);
    },

    applyCleanState(item) {
      if (window.ModuleRegistry?.clearAllEffects) {
        ModuleRegistry.clearAllEffects();
      }

      this.applyMasterOutput(item.masterOutput);
    },

    applyEffectState(item) {
      this.applyCleanState(item);

      if (item.preset && item.preset.activeModule) {
        this.applyActiveModuleState(item.preset.activeModule);
        this.applyControlState(item.preset.master?.controls || []);
        return;
      }

      this.applyCompactModuleState(item);
      this.applyMasterOutput(item.masterOutput);
    },

    applyCompactModuleState(item) {
      const moduleId = item.fx;
      if (!moduleId) return;

      const card = this.findEffectCardById(moduleId, MODULE_TITLES[moduleId]);
      if (!card) return;

      const enableSelector = ENABLE_SELECTORS[moduleId];
      const enableControl = enableSelector ? this.findControl(enableSelector) : null;

      if (enableControl) {
        enableControl.checked = true;
        enableControl.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        const checkbox = card.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }

      const paramMap = PARAM_SELECTORS[moduleId] || {};
      const params = item.compactParams || {};

      Object.entries(params).forEach(([shortKey, value]) => {
        if (shortKey === "master") return;

        const selector = paramMap[shortKey];
        if (!selector) return;

        this.applySingleControl(selector, value);
      });
    },

    applyActiveModuleState(activeModule) {
      if (!activeModule || !activeModule.id) return;

      const card = this.findEffectCardById(activeModule.id, activeModule.title);
      if (!card) return;

      const checkbox = card.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }

      this.applyControlState(activeModule.controls || []);
    },

    findEffectCardById(id, title) {
      const cards = Array.from(document.querySelectorAll("#effectsContainer .effect-card"));

      return cards.find((card) => {
        const checkbox = card.querySelector('input[type="checkbox"][id$="-enabled"]');
        const cardId = checkbox?.id ? checkbox.id.replace("-enabled", "") : "";
        const headingText = card.querySelector("h3")?.textContent?.replace(/\s+/g, " ").trim() || "";
        return cardId === id || headingText.includes(title || "__never__");
      }) || null;
    },

    applyControlState(controls) {
      controls.forEach((item) => {
        this.applySingleControl(item.key, item.value);
      });
    },

    applySingleControl(key, value) {
      const control = this.findControl(key);
      if (!control) return;

      if (control.type === "checkbox") {
        control.checked = Boolean(value);
        control.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        control.value = value;
        control.dispatchEvent(new Event("input", { bubbles: true }));
        control.dispatchEvent(new Event("change", { bubbles: true }));
      }
    },

    applyMasterOutput(value) {
      const masterValue = value === undefined || value === null ? 0 : value;
      this.applySingleControl("#master-slider", masterValue);
    },

    findControl(key) {
      if (!key) return null;

      try {
        if (key.startsWith("#") || key.startsWith("[name=")) {
          return document.querySelector(key);
        }
      } catch (error) {
        return null;
      }

      return null;
    },

    checkAnswer() {
      if (!this.currentItem) return;

      const selected = this.els.form.querySelector('input[name="fxAnswer"]:checked');

      if (!selected) {
        this.setFeedback("Choose an answer before submitting.", "incorrect");
        return;
      }

      const isCorrect = selected.value === this.currentItem.correctAnswerId;

      if (isCorrect) {
        this.pool = this.pool.filter((item) => item.id !== this.currentItem.id);
        this.setFeedback(`Correct. That was ${this.currentItem.correctAnswerLabel}.`, "correct");
      } else {
        this.setFeedback(
          `Not quite. The correct answer was ${this.currentItem.correctAnswerLabel}. This example will stay in the quiz pool.`,
          "incorrect"
        );
      }

      this.els.submit.disabled = true;
      this.els.next.disabled = false;
      this.updateProgress();
    },

    getAnswerForCompactItem(item) {
      const fx = String(item.fx || "");
      const params = item.p || {};

      if (item.answerId) {
        return this.choice(item.answerId) || {
          id: item.answerId,
          label: item.answer || item.answerId,
          category: this.getCategoryForAnswerId(item.answerId)
        };
      }

      if (fx === "lowshelf") {
        const gain = this.toNumber(params.g);
        return gain >= 0 ? this.choice("lowshelf-boost") : this.choice("lowshelf-attenuate");
      }

      if (fx === "highshelf") {
        const gain = this.toNumber(params.g);
        return gain >= 0 ? this.choice("highshelf-boost") : this.choice("highshelf-attenuate");
      }

      if (fx === "delay") {
        const feedback = this.toNumber(params.fb);
        return feedback > 0 ? this.choice("feedback-delay") : this.choice("feed-forward-delay");
      }

      if (fx === "distortion") {
        const overdrive = this.toNumber(params.od);
        const distortion = this.toNumber(params.ds);
        const fuzz = this.toNumber(params.fz);

        if (overdrive > 0 && overdrive >= distortion && overdrive >= fuzz) {
          return this.choice("overdrive");
        }

        if (fuzz > 0 && fuzz >= overdrive && fuzz >= distortion) {
          return this.choice("fuzz");
        }

        if (distortion > 0 && distortion >= overdrive && distortion >= fuzz) {
          return this.choice("distortion");
        }

        return this.choice("distortion");
      }

      return this.choice(fx) || {
        id: fx,
        label: MODULE_TITLES[fx] || fx,
        category: this.getCategoryForAnswerId(fx)
      };
    },

    getAnswerForLegacyPreset(preset) {
      const moduleId = preset.activeModule?.id || "";
      const controls = preset.activeModule?.controls || [];

      if (moduleId === "lowshelf") {
        const gain = this.getNumericControlValue(controls, "#lowshelf-gain");
        return gain >= 0 ? this.choice("lowshelf-boost") : this.choice("lowshelf-attenuate");
      }

      if (moduleId === "highshelf") {
        const gain = this.getNumericControlValue(controls, "#highshelf-gain");
        return gain >= 0 ? this.choice("highshelf-boost") : this.choice("highshelf-attenuate");
      }

      if (moduleId === "delay") {
        const feedback = this.getNumericControlValue(controls, "#delay-feedback");
        return feedback > 0 ? this.choice("feedback-delay") : this.choice("feed-forward-delay");
      }

      if (moduleId === "distortion") {
        const overdrive = this.getNumericControlValue(controls, "#distortion-overdrive");
        const distortion = this.getNumericControlValue(controls, "#distortion-distortion");
        const fuzz = this.getNumericControlValue(controls, "#distortion-fuzz");

        if (overdrive > 0 && overdrive >= distortion && overdrive >= fuzz) {
          return this.choice("overdrive");
        }

        if (fuzz > 0 && fuzz >= overdrive && fuzz >= distortion) {
          return this.choice("fuzz");
        }

        if (distortion > 0 && distortion >= overdrive && distortion >= fuzz) {
          return this.choice("distortion");
        }

        return this.choice("distortion");
      }

      return this.choice(moduleId) || {
        id: moduleId,
        label: preset.activeModule?.title || moduleId,
        category: this.getCategoryForAnswerId(moduleId)
      };
    },

    paramsFromLegacyPreset(preset) {
      const moduleId = preset.activeModule?.id || "";
      const controls = preset.activeModule?.controls || [];
      const params = {};

      const reverseMap = {};
      Object.entries(PARAM_SELECTORS[moduleId] || {}).forEach(([shortKey, selector]) => {
        reverseMap[selector] = shortKey;
      });

      controls.forEach((control) => {
        const shortKey = reverseMap[control.key];
        if (shortKey) params[shortKey] = control.value;
      });

      return params;
    },

    masterFromLegacyPreset(preset) {
      const controls = preset.master?.controls || [];
      const master = controls.find((control) => control.key === "#master-slider");
      return master?.value ?? 0;
    },

    getNumericControlValue(controls, key) {
      const item = controls.find((control) => control.key === key);
      return this.toNumber(item?.value);
    },

    toNumber(value) {
      const number = Number(value || 0);
      return Number.isFinite(number) ? number : 0;
    },

    choice(id) {
      return ANSWER_CHOICES.find((choice) => choice.id === id);
    },

    clearAnswerSelection() {
      this.els.form.querySelectorAll('input[name="fxAnswer"]').forEach((input) => {
        input.checked = false;
      });
    },

    updateProgress() {
      const remaining = this.pool.length;
      const total = this.activeBank.length || this.bank.length;
      const completed = Math.max(total - remaining, 0);
      this.els.progress.textContent = `${completed} correct • ${remaining} remaining`;
    },

    setControlsEnabled(enabled) {
      this.els.playClean.disabled = !enabled;
      this.els.playEffect.disabled = !enabled;
      this.els.stop.disabled = !enabled;
      this.els.submit.disabled = !enabled;
    },

    setFeedback(message, type) {
      this.els.feedback.textContent = message;
      this.els.feedback.classList.remove("correct", "incorrect");
      if (type) this.els.feedback.classList.add(type);
    },

    setStatus(message) {
      this.els.status.textContent = message;
    },

    async resumeAudioContext() {
      if (AppState.audioContext?.state === "suspended") {
        await AppState.audioContext.resume();
      }
    },

    delay(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    }
  };

  window.AudioFXQuiz = Quiz;

  window.addEventListener("DOMContentLoaded", () => {
    Quiz.init();
  });
})();
