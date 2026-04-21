window.addEventListener('DOMContentLoaded', async () => {

  await AudioEngine.init();

  ModuleRegistry.initAll();

  Transport.init();
  UploadManager.init();
  ResetFX.init();

  await LibraryManager.load();

  Utils.setStatus("Ready");
});
