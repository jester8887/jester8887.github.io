(function () {
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

    { id: "distortion", label: "Distortion", category: "distortion" },

    { id: "feed-forward-delay", label: "Feed-Forward Delay", category: "delayReverb" },
    { id: "feedback-delay", label: "Feedback Delay", category: "delayReverb" },
    { id: "reverb", label: "Reverb", category: "delayReverb" },

    { id: "tremolo", label: "Tremolo", category: "modulation" },
    { id: "vibrato", label: "Vibrato", category: "modulation" },
    { id: "chorus", label: "Chorus", category: "modulation" },
    { id: "flanger", label: "Flanger", category: "modulation" }
  ];

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

        if (!this.pool.length) {
          this.setFeedback("No quiz examples were found for the selected FX filter.", "incorrect");
          this.setStatus("No examples found.");
          this.updateProgress();
          return;
        }

        await this.loadNextQuestion();
      } catch (error) {
        console.error(error);
        this.setFeedback("The quiz could not load. Check that json/audio_fx_quiz_bank.json and the audio files are uploaded in the correct folders.", "incorrect");
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

      ANSWER_CHOICES.forEach((choice) => {
        const label = document.createElement("label");
        label.className = "answer-option";
        label.dataset.category = choice.category;
        label.innerHTML = `
          <input type="radio" name="fxAnswer" value="${choice.id}" />
          <span>${choice.label}</span>
        `;
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
      const response = await fetch("json/audio_fx_quiz_bank.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load quiz bank.");

      const data = await response.json();
      const items = Array.isArray(data) ? data : data.items;

      this.bank = (items || [])
        .filter((item) => item && item.preset && item.preset.activeModule)
        .map((item) => {
          const answer = this.getAnswerForPreset(item.preset);
          return {
            ...item,
            correctAnswerId: answer.id,
            correctAnswerLabel: answer.label,
            correctAnswerCategory: answer.category || this.getCategoryForAnswerId(answer.id)
          };
        });
    },

    generateFilteredQuiz() {
      this.stopAudio();
      this.clearAnswerSelection();

      this.activeBank = this.getFilteredBank();
      this.pool = [...this.activeBank];
      this.currentItem = null;

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
        this.setFeedback("Great work. Click Generate Quiz to start again with the selected filter, or refresh the page.", "correct");
        this.updateProgress();
        this.setStatus("Complete");
        return;
      }

      const index = Math.floor(Math.random() * this.pool.length);
      this.currentItem = this.pool[index];

      this.els.prompt.textContent = this.currentItem.prompt || "Listen and identify the active effect.";
      this.els.source.textContent = `Source: ${this.currentItem.preset.source?.title || "Unknown source"}`;
      this.setFeedback("Use Play Clean and Play Effect as many times as needed, then submit your answer.", "");
      this.updateProgress();
      this.setStatus("Example ready");
      this.setControlsEnabled(true);

      await this.ensureSourceLoaded(this.currentItem.preset);
      this.applyCleanState(this.currentItem.preset);
    },

    async playClean() {
      if (!this.currentItem || this.busy) return;
      this.busy = true;
      this.setStatus("Playing clean audio...");

      try {
        await this.ensureSourceLoaded(this.currentItem.preset);
        this.applyCleanState(this.currentItem.preset);
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
        await this.ensureSourceLoaded(this.currentItem.preset);
        this.applyEffectState(this.currentItem.preset);
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

    async ensureSourceLoaded(preset) {
      const source = preset.source;
      if (!source || source.type !== "library" || !source.title) return;

      const alreadyLoaded = AppState.selectedItem && AppState.selectedItem.title === source.title;
      if (alreadyLoaded && AppState.audioBuffer) return;

      const item = AppState.library.find((candidate) => candidate.title === source.title);
      if (!item) throw new Error(`Source not found: ${source.title}`);

      await LibraryManager.loadItem(item);
    },

    applyCleanState(preset) {
      if (window.ModuleRegistry?.clearAllEffects) {
        ModuleRegistry.clearAllEffects();
      }

      this.applyControlState(preset.master?.controls || []);
    },

    applyEffectState(preset) {
      this.applyCleanState(preset);
      this.applyActiveModuleState(preset.activeModule);
      this.applyControlState(preset.master?.controls || []);
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
        const control = this.findControl(item.key);
        if (!control) return;

        if (control.type === "checkbox") {
          control.checked = Boolean(item.value);
          control.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          control.value = item.value;
          control.dispatchEvent(new Event("input", { bubbles: true }));
          control.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
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
        this.setFeedback(`Not quite. The correct answer was ${this.currentItem.correctAnswerLabel}. This example will stay in the quiz pool.`, "incorrect");
      }

      this.els.submit.disabled = true;
      this.els.next.disabled = false;
      this.updateProgress();
    },

    getAnswerForPreset(preset) {
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

      return this.choice(moduleId) || {
        id: moduleId,
        label: preset.activeModule?.title || moduleId,
        category: ""
      };
    },

    getNumericControlValue(controls, key) {
      const item = controls.find((control) => control.key === key);
      const value = Number(item?.value || 0);
      return Number.isFinite(value) ? value : 0;
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
