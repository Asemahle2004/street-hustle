// STREET HUSTLE — INTEGRATION SAFETY
// Keeps movement locked whenever any overlay/menu is open and surfaces runtime
// errors in a small visible banner for easier browser testing.

const world = window.StreetHustleWorld;
if (world?.app) {
  const buildBadge = document.createElement('div');
  buildBadge.id = 'build-badge';
  buildBadge.textContent = 'ALPHA 0.9 · FULL SCOPE BUILD';
  document.body.appendChild(buildBadge);

  const errorBanner = document.createElement('div');
  errorBanner.id = 'runtime-error-banner';
  document.body.appendChild(errorBanner);

  function visible(id) {
    return document.getElementById(id)?.classList.contains('visible');
  }

  world.app.on('update', () => {
    const anyModal = Boolean(
      visible('dialogue') ||
      visible('phone') ||
      visible('tasks-panel') ||
      visible('taxi-panel') ||
      visible('world-event-panel') ||
      visible('pause-menu') ||
      visible('tutorial-screen') ||
      visible('completion-screen') ||
      visible('life-panel') ||
      visible('city-feed')
    );
    window.StreetHustleUIBlocking = anyModal;
  });

  function showError(message) {
    errorBanner.textContent = `GAME ERROR: ${message}`;
    errorBanner.classList.add('visible');
    clearTimeout(showError._timer);
    showError._timer = setTimeout(() => errorBanner.classList.remove('visible'), 12000);
  }

  window.addEventListener('error', event => {
    if (event?.message) showError(event.message);
  });
  window.addEventListener('unhandledrejection', event => {
    const reason = event?.reason;
    showError(reason?.message || String(reason || 'Unknown promise error'));
  });
}
