window.addEventListener('DOMContentLoaded', async () => {
  await AudioEngine.init();

  ModuleRegistry.initAll();

  document.addEventListener('change', (e) => {
    if (!e.target.matches('.inline-toggle input[type="checkbox"]')) return;
    if (!e.target.checked) return;

    const allToggles = document.querySelectorAll('.inline-toggle input[type="checkbox"]');

    allToggles.forEach((checkbox) => {
      if (checkbox !== e.target && checkbox.checked) {
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  Transport.init();
  UploadManager.init();
  ResetFX.init();

  await LibraryManager.load();

  Utils.setStatus("Ready");
});
