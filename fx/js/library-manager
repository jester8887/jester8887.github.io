window.LibraryManager = {

  async load() {
    try {
      const res = await fetch('json/audio-library.json');
      const data = await res.json();

      AppState.library = data;
      this.render();

      Utils.setStatus("Library loaded");
    } catch {
      Utils.setStatus("Failed to load library");
    }
  },

  render() {
    DOM.libraryList.innerHTML = "";

    AppState.library.forEach(item => {
      const row = document.createElement('div');
      row.className = "library-item";

      row.innerHTML = `
        <div>
          <div class="library-item-title">${item.title}</div>
          <div class="library-item-meta">${item.category}</div>
        </div>
        <button>Load</button>
      `;

      row.querySelector('button').onclick = () => {
        this.loadItem(item);
      };

      DOM.libraryList.appendChild(row);
    });
  },

  async loadItem(item) {
    Utils.setStatus("Loading " + item.title);

    const res = await fetch(item.file);
    const buffer = await res.arrayBuffer();

    await AudioEngine.loadBufferFromArrayBuffer(buffer);

    AppState.selectedItem = item;

    Utils.setActiveSource(item.title);
    Utils.setStatus("Loaded");
  }
};
