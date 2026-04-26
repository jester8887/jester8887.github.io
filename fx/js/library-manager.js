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

    if (AppState.uploadedItem && AppState.uploadedArrayBuffer) {
      const uploadBtn = document.createElement('button');
      uploadBtn.type = 'button';
      uploadBtn.className = 'library-grid-button';

      if (
        AppState.selectedItem &&
        AppState.selectedItem.type === "upload"
      ) {
        uploadBtn.classList.add('active');
      }

      uploadBtn.innerHTML = `
        <span class="library-grid-title">Custom: ${AppState.uploadedItem.title}</span>
        <span class="library-grid-meta">uploaded</span>
      `;

      uploadBtn.onclick = () => {
        this.loadUploadedItem();
      };

      grid.appendChild(uploadBtn);
    }

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

  async loadUploadedItem() {
    if (!AppState.uploadedItem || !AppState.uploadedArrayBuffer) return;

    Utils.setStatus("Loading " + AppState.uploadedItem.title);

    await AudioEngine.loadBufferFromArrayBuffer(AppState.uploadedArrayBuffer);

    AppState.selectedItem = AppState.uploadedItem;

    Utils.setActiveSource(AppState.uploadedItem.title);
    Utils.setStatus("Loaded");

    this.render();
  },

  async loadItem(item) {
    Utils.setStatus("Loading " + item.title);

    if (DOM.uploadInput) {
      DOM.uploadInput.value = "";
    }

    const res = await fetch(item.file);
    const buffer = await res.arrayBuffer();

    await AudioEngine.loadBufferFromArrayBuffer(buffer);

    AppState.selectedItem = item;

    Utils.setActiveSource(item.title);
    Utils.setStatus("Loaded");

    this.render();
  }
};
