(function () {
  const CUSTOM_AUDIO_TEXT = "Custom Audio File N/A";

  const PresetCodes = {
    els: {},
    isApplying: false,
    updateTimer: null,

    init() {
      this.cacheEls();
      if (!this.els.panel || !this.els.field) return;

      this.bindUI();
      this.watchAppChanges();

      window.setTimeout(() => this.updateCode(), 250);
      window.setTimeout(() => this.updateCode(), 1000);
    },

    cacheEls() {
      this.els.panel = document.getElementById("presetCodePanel");
      this.els.toggle = document.getElementById("presetCodeToggle");
      this.els.field = document.getElementById("presetCodeField");
      this.els.copyBtn = document.getElementById("copyPresetCodeBtn");
      this.els.loadBtn = document.getElementById("loadPresetCodeBtn");
      this.els.libraryList = document.getElementById("libraryList");
      this.els.effectsContainer = document.getElementById("effectsContainer");
      this.els.masterOutputHost = document.getElementById("masterOutputHost");
      this.els.uploadInput = document.getElementById("uploadInput");
      this.els.statusText = document.getElementById("statusText");
      this.els.activeSourceText = document.getElementById("activeSourceText");
    },

    bindUI() {
      this.els.toggle?.addEventListener("click", () => this.togglePanel());
      this.els.copyBtn?.addEventListener("click", () => this.copyCode());
      this.els.loadBtn?.addEventListener("click", () => this.loadCode());

      document.addEventListener("input", (event) => {
        if (this.shouldIgnoreEvent(event)) return;
        this.scheduleUpdate();
      });

      document.addEventListener("change", (event) => {
        if (this.shouldIgnoreEvent(event)) return;
        this.scheduleUpdate();
      });

      document.addEventListener("click", (event) => {
        if (this.shouldIgnoreEvent(event)) return;

        const target = event.target;
        if (
          target.closest("#libraryList") ||
          target.closest("#resetBtn") ||
          target.closest(".effect-card") ||
          target.closest("#masterOutputHost")
        ) {
          this.scheduleUpdate(120);
        }
      });
    },

    watchAppChanges() {
      if (this.els.libraryList) {
        const libraryObserver = new MutationObserver(() => this.scheduleUpdate(120));
        libraryObserver.observe(this.els.libraryList, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["class"]
        });
      }

      if (this.els.effectsContainer) {
        const effectsObserver = new MutationObserver(() => this.scheduleUpdate(120));
        effectsObserver.observe(this.els.effectsContainer, {
          childList: true,
          subtree: true
        });
      }

      if (this.els.masterOutputHost) {
        const masterObserver = new MutationObserver(() => this.scheduleUpdate(120));
        masterObserver.observe(this.els.masterOutputHost, {
          childList: true,
          subtree: true
        });
      }
    },

    shouldIgnoreEvent(event) {
      if (this.isApplying) return true;
      if (!event.target) return false;

      return Boolean(event.target.closest("#presetCodePanel"));
    },

    togglePanel() {
      const isCollapsed = this.els.panel.classList.toggle("collapsed");
      this.els.toggle.setAttribute("aria-expanded", String(!isCollapsed));
    },

    scheduleUpdate(delay = 40) {
      window.clearTimeout(this.updateTimer);
      this.updateTimer = window.setTimeout(() => this.updateCode(), delay);
    },

    updateCode() {
      if (this.isApplying || !this.els.field) return;

      if (this.isCustomAudioActive()) {
        this.els.field.value = CUSTOM_AUDIO_TEXT;
        return;
      }

      const preset = {
        version: 1,
        app: "Audio FX Workshop",
        source: this.getSourceState(),
        controls: this.getControlState()
      };

      this.els.field.value = JSON.stringify(preset);
    },

    isCustomAudioActive() {
      const uploadHasFile = Boolean(this.els.uploadInput?.files?.length);
      const activeText = this.els.activeSourceText?.textContent || "";

      return (
        uploadHasFile &&
        !this.getActiveLibraryButton() &&
        /custom|upload|uploaded/i.test(activeText)
      );
    },

    getSourceState() {
      const activeButton = this.getActiveLibraryButton();

      if (!activeButton) {
        return {
          type: "none",
          title: ""
        };
      }

      const titleEl = activeButton.querySelector(".library-grid-title, .library-item-title");
      const metaEl = activeButton.querySelector(".library-grid-meta, .library-item-meta");

      return {
        type: "library",
        title: this.cleanText(titleEl?.textContent || activeButton.textContent || ""),
        meta: this.cleanText(metaEl?.textContent || "")
      };
    },

    getActiveLibraryButton() {
      return document.querySelector(
        "#libraryList .library-grid-button.active, #libraryList .library-item.active, #libraryList button.active"
      );
    },

    getControlState() {
      const roots = [
        this.els.effectsContainer,
        this.els.masterOutputHost
      ].filter(Boolean);

      const controls = [];

      roots.forEach((root) => {
        const inputs = root.querySelectorAll("input, select, textarea");

        inputs.forEach((control) => {
          if (control.type === "file") return;
          if (!this.getControlKey(control)) return;

          controls.push({
            key: this.getControlKey(control),
            tag: control.tagName.toLowerCase(),
            type: control.type || "",
            value: control.type === "checkbox" ? control.checked : control.value
          });
        });
      });

      return controls;
    },

    getControlKey(control) {
      if (control.id) return `#${control.id}`;
      if (control.name) return `[name="${control.name}"]`;

      const card = control.closest(".effect-card, .transport-master");
      const cardLabel = card?.querySelector("h3")?.textContent?.trim() || "";
      const allControls = Array.from(card?.querySelectorAll("input, select, textarea") || []);
      const index = allControls.indexOf(control);

      if (cardLabel && index >= 0) {
        return `card:${cardLabel}:control:${index}`;
      }

      return "";
    },

    async copyCode() {
      if (!this.els.field) return;

      try {
        await navigator.clipboard.writeText(this.els.field.value);
        this.setStatus("Preset code copied.");
      } catch (error) {
        this.els.field.select();
        document.execCommand("copy");
        this.setStatus("Preset code copied.");
      }
    },

    loadCode() {
      if (!this.els.field) return;

      const raw = this.els.field.value.trim();

      if (!raw || raw === CUSTOM_AUDIO_TEXT) {
        this.setStatus("Custom audio files cannot be restored from a preset code.");
        return;
      }

      let preset;

      try {
        preset = JSON.parse(raw);
      } catch (error) {
        this.setStatus("Preset code could not be read.");
        return;
      }

      if (!preset || preset.version !== 1 || !Array.isArray(preset.controls)) {
        this.setStatus("Preset code format is not recognized.");
        return;
      }

      this.isApplying = true;

      try {
        this.applySourceState(preset.source);
        this.applyControlState(preset.controls);
        this.setStatus("Preset code loaded.");
      } finally {
        this.isApplying = false;
        this.scheduleUpdate(150);
      }
    },

    applySourceState(source) {
      if (!source || source.type !== "library" || !source.title) return;

      const buttons = Array.from(
        document.querySelectorAll("#libraryList .library-grid-button, #libraryList .library-item, #libraryList button")
      );

      const match = buttons.find((button) => {
        const titleEl = button.querySelector(".library-grid-title, .library-item-title");
        const title = this.cleanText(titleEl?.textContent || button.textContent || "");
        return title === source.title;
      });

      if (match) {
        match.click();
      }
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

      if (key.startsWith("#") || key.startsWith("[name=")) {
        try {
          return document.querySelector(key);
        } catch (error) {
          return null;
        }
      }

      if (key.startsWith("card:")) {
        const parts = key.split(":control:");
        const label = parts[0].replace("card:", "");
        const index = Number(parts[1]);

        if (!Number.isFinite(index)) return null;

        const cards = Array.from(document.querySelectorAll(".effect-card, .transport-master"));
        const card = cards.find((candidate) => {
          const h3 = candidate.querySelector("h3");
          return h3 && h3.textContent.trim() === label;
        });

        return card?.querySelectorAll("input, select, textarea")?.[index] || null;
      }

      return null;
    },

    setStatus(message) {
      if (window.Utils?.setStatus) {
        window.Utils.setStatus(message);
        return;
      }

      if (this.els.statusText) {
        this.els.statusText.textContent = message;
      }
    },

    cleanText(value) {
      return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
    }
  };

  window.PresetCodes = PresetCodes;

  document.addEventListener("DOMContentLoaded", () => {
    PresetCodes.init();
  });
})();
