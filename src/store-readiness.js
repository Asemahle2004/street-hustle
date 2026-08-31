// STREET HUSTLE — STORE READINESS UI
// Keeps required privacy/legal information reachable inside the game and
// registers the web service worker when running as a normal website/PWA.

const isNative = Boolean(window.Capacitor?.isNativePlatform?.());

if ('serviceWorker' in navigator && !isNative && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Street Hustle service worker registration skipped.', error);
    });
  });
}

const legalButton = document.createElement('button');
legalButton.id = 'legal-button';
legalButton.type = 'button';
legalButton.textContent = 'LEGAL';
legalButton.setAttribute('aria-label', 'Privacy and legal information');

document.body.appendChild(legalButton);

const legalPanel = document.createElement('section');
legalPanel.id = 'legal-panel';
legalPanel.setAttribute('aria-label', 'Street Hustle legal information');
legalPanel.innerHTML = `
  <div class="legal-card">
    <h2>Street Hustle</h2>
    <p>This is a fictional 3D life-simulation game. Game money, businesses, characters, police events and locations are fictional gameplay systems.</p>
    <div class="legal-actions">
      <a href="privacy.html">Privacy Policy</a>
      <a href="licenses.html">Third-Party Notices</a>
    </div>
    <p><strong>Save data:</strong> the current game stores progress locally on this device. There is no player account, advertising SDK or analytics SDK in this build.</p>
    <button class="legal-close" type="button">Close</button>
  </div>`;
document.body.appendChild(legalPanel);

function setLegal(open) {
  legalPanel.classList.toggle('visible', open);
  window.StreetHustleStoreBlocking = open;
}

legalButton.addEventListener('click', () => setLegal(true));
legalPanel.querySelector('.legal-close')?.addEventListener('click', () => setLegal(false));
legalPanel.addEventListener('click', (event) => {
  if (event.target === legalPanel) setLegal(false);
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && legalPanel.classList.contains('visible')) {
    event.preventDefault();
    event.stopPropagation();
    setLegal(false);
  }
}, true);

if (isNative) {
  document.body.classList.add('street-hustle-native');
  const chip = document.createElement('div');
  chip.className = 'native-build-chip';
  chip.textContent = 'ANDROID BUILD';
  document.body.appendChild(chip);
}

window.StreetHustleStoreReadiness = { isNative, setLegal };
