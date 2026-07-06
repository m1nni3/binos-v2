const SETTINGS_KEY = 'POMP_SETTINGS';

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent('pomp-settings-changed', { detail: s }));
}

export function renderSettings(container) {
  const settings = loadSettings();
  let logoPreview = settings.logo || '';
  let faviconPreview = settings.favicon || '';
  let saving = false;

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      logoPreview = await readFile(file);
      render();
    } catch {}
  }

  async function handleFaviconUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      faviconPreview = await readFile(file);
      render();
    } catch {}
  }

  function resetLogo() {
    logoPreview = '';
    document.querySelector('[data-logo-input]').value = '';
    render();
  }

  function resetFavicon() {
    faviconPreview = '';
    document.querySelector('[data-favicon-input]').value = '';
    render();
  }

  function save() {
    saving = true;
    render();
    setTimeout(() => {
      saveSettings({ logo: logoPreview, favicon: faviconPreview });
      applyFavicon(faviconPreview);
      saving = false;
      render();
    }, 300);
  }

  render();

  function render() {
    container.innerHTML =
      '<div class="max-w-2xl mx-auto">' +
        '<div class="mb-6">' +
          '<h2 class="page-title">Settings</h2>' +
          '<p class="text-sm text-binos-gray mt-1">Customize your POMP branding — logo and favicon</p>' +
        '</div>' +

        '<div class="card p-6 mb-6">' +
          '<h3 class="font-display font-semibold text-lg mb-4">Branding</h3>' +

          '<div class="space-y-6">' +
            '<div>' +
              '<label class="block text-sm font-medium text-binos-gray mb-2">Logo</label>' +
              '<div class="flex items-start gap-4">' +
                '<div class="w-20 h-20 rounded-xl border-2 border-dashed border-binos-border flex items-center justify-center overflow-hidden flex-shrink-0 bg-binos-light/50">' +
                  (logoPreview
                    ? '<img src="' + logoPreview + '" class="w-full h-full object-contain">'
                    : '<span class="text-binos-gray text-xs text-center px-1">No logo set</span>') +
                '</div>' +
                '<div class="flex flex-col gap-2">' +
                  '<label class="btn-primary btn-sm cursor-pointer inline-flex items-center gap-2">' +
                    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> Upload Logo' +
                    '<input type="file" accept="image/*" class="hidden" data-logo-input>' +
                  '</label>' +
                  (logoPreview ? '<button class="btn-secondary btn-sm" onclick="() => { logoPreview = \'\'; document.querySelector(\'[data-logo-input]\').value = \'\'; render(); }">Remove</button>' : '') +
                  '<p class="text-xs text-binos-gray">Recommended: PNG or SVG, max 200x200px</p>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<div>' +
              '<label class="block text-sm font-medium text-binos-gray mb-2">Favicon</label>' +
              '<div class="flex items-start gap-4">' +
                '<div class="w-12 h-12 rounded-lg border-2 border-dashed border-binos-border flex items-center justify-center overflow-hidden flex-shrink-0 bg-binos-light/50">' +
                  (faviconPreview
                    ? '<img src="' + faviconPreview + '" class="w-full h-full object-contain">'
                    : '<span class="text-binos-gray text-xs text-center px-1">None</span>') +
                '</div>' +
                '<div class="flex flex-col gap-2">' +
                  '<label class="btn-primary btn-sm cursor-pointer inline-flex items-center gap-2">' +
                    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> Upload Favicon' +
                    '<input type="file" accept="image/*" class="hidden" data-favicon-input>' +
                  '</label>' +
                  (faviconPreview ? '<button class="btn-secondary btn-sm" onclick="() => { faviconPreview = \'\'; document.querySelector(\'[data-favicon-input]\').value = \'\'; render(); }">Remove</button>' : '') +
                  '<p class="text-xs text-binos-gray">Recommended: PNG or ICO, 32x32px or 64x64px</p>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="flex gap-3">' +
          '<button class="btn-primary flex-1 justify-center" onclick="() => { saving = true; render(); setTimeout(() => { saveSettings({ logo: logoPreview, favicon: faviconPreview }); applyFavicon(faviconPreview); saving = false; render(); }, 300); }" ' + (saving ? 'disabled' : '') + '>' +
            (saving ? 'Saving...' : 'Save Changes') +
          '</button>' +
        '</div>' +
      '</div>';

    container.querySelectorAll('[data-logo-input]').forEach(el => { el.onchange = handleLogoUpload; });
    container.querySelectorAll('[data-favicon-input]').forEach(el => { el.onchange = handleFaviconUpload; });
    container.querySelectorAll('[onclick^="() => { logoPreview")').forEach(el => { el.onclick = resetLogo; });
    container.querySelectorAll('[onclick^="() => { faviconPreview")').forEach(el => { el.onclick = resetFavicon; });
    container.querySelectorAll('[onclick^="() => { saving")').forEach(el => { el.onclick = save; });
  }
}

export function applyFavicon(dataUrl) {
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  if (dataUrl) {
    link.href = dataUrl;
  } else {
    link.href = '/public/favicon.ico';
  }
}

export function applyBranding() {
  const s = loadSettings();
  if (s.favicon) applyFavicon(s.favicon);
}
