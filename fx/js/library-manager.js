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

    const grid = document.createElement('div');
    grid.className = 'library-grid';

    AppState.library.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'library-grid-button';

      if (
        AppState.selectedItem &&
        AppState.selectedItem.title === item.title &&
        AppState.selectedItem.file === item.file
      ) {
        btn.classList.add('active');
      }

      btn.innerHTML = `
        <span class="library-grid-title">${item.title}</span>
        <span class="library-grid-meta">${item.category}</span>
      `;

      btn.onclick = () => {
        this.loadItem(item);
      };

      grid.appendChild(btn);
    });

    DOM.libraryList.appendChild(grid);
  },

  async loadItem(item) {
    Utils.setStatus("Loading " + item.title);

    const res = await fetch(item.file);
    const buffer = await res.arrayBuffer();

    await AudioEngine.loadBufferFromArrayBuffer(buffer);

    AppState.selectedItem = item;

    Utils.setActiveSource(item.title);
    Utils.setStatus("Loaded");

    this.render();
  }
};
