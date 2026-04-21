window.Utils = {
  clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  },

  logSliderToHz(value, min = 20, max = 20000) {
    const normalized = value / 100;
    return min * Math.pow(max / min, normalized);
  },

  formatHz(v) {
    return v >= 1000 ? `${(v / 1000).toFixed(2)} kHz` : `${Math.round(v)} Hz`;
  },

  setStatus(text) {
    DOM.statusText.textContent = text;
  },

  setActiveSource(text) {
    DOM.activeSourceText.textContent = `Active source: ${text}`;
  }
};
