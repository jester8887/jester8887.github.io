window.UploadManager = {
    init() {
      if (!DOM.uploadInput) return;
    
      DOM.uploadInput.addEventListener('click', () => {
        DOM.uploadInput.value = "";
      });
    DOM.uploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      Utils.setStatus("Loading uploaded file...");

      const buffer = await file.arrayBuffer();

      AppState.uploadedArrayBuffer = buffer;
      AppState.uploadedItem = {
        title: file.name,
        category: "uploaded",
        type: "upload"
      };

      await AudioEngine.loadBufferFromArrayBuffer(buffer);

      AppState.selectedItem = AppState.uploadedItem;

      Utils.setActiveSource(file.name);
      Utils.setStatus("Uploaded file ready");

      if (window.LibraryManager && LibraryManager.render) {
        LibraryManager.render();
      }
    });
  }
};
