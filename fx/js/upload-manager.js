window.UploadManager = {
  init() {
    DOM.uploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      Utils.setStatus("Loading uploaded file...");

      const buffer = await file.arrayBuffer();
      await AudioEngine.loadBufferFromArrayBuffer(buffer);

      AppState.selectedItem = {
        title: file.name,
        category: "uploaded"
      };

      Utils.setActiveSource(file.name);
      Utils.setStatus("Uploaded file ready");

      if (window.LibraryManager && LibraryManager.render) {
        LibraryManager.render();
      }
    });
  }
};
