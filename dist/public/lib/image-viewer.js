import { escHtml } from './utils.js';

export function openImageViewer({ url, name, onReplace, onDelete }) {
  const hasEdit = typeof onReplace === 'function' || typeof onDelete === 'function';
  const safeUrl = escHtml(url);
  const safeName = escHtml(name || '');

  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-4';
  overlay.innerHTML =
    '<div class="relative max-w-5xl w-full max-h-[90vh] flex flex-col">' +
      '<div class="flex items-center justify-between mb-2">' +
        '<div class="text-white text-sm font-medium truncate">' + safeName + '</div>' +
        '<div class="flex gap-2">' +
          (hasEdit ? '<button class="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors" data-ivr-edit>' +
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>' +
          '</button>' : '') +
          '<button class="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors" data-ivr-close>' +
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="flex-1 flex items-center justify-center bg-black/40 rounded-lg overflow-hidden min-h-[300px] relative">' +
        '<img src="' + safeUrl + '" class="max-w-full max-h-[75vh] object-contain" alt="' + safeName + '">' +
        (hasEdit ? '<div class="absolute top-3 right-3 bg-white rounded-lg shadow-xl border hidden min-w-[160px] py-1 z-10" data-ivr-menu>' +
          (typeof onReplace === 'function' ? '<button class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2" data-ivr-replace>' +
            '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> Replace Image' +
          '</button>' : '') +
          (typeof onDelete === 'function' ? '<button class="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2" data-ivr-delete>' +
            '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg> Delete Image' +
          '</button>' : '') +
        '</div>' +
        (typeof onReplace === 'function' ? '<input type="file" accept="image/*" class="hidden" data-ivr-file>' : '') : '') +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  const menu = overlay.querySelector('[data-ivr-menu]');
  const editBtn = overlay.querySelector('[data-ivr-edit]');
  const fileInput = overlay.querySelector('[data-ivr-file]');

  let menuOpen = false;

  const close = () => {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  };

  overlay.querySelector('[data-ivr-close]').onclick = close;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', onKey);

  if (editBtn) {
    editBtn.onclick = (e) => {
      e.stopPropagation();
      menuOpen = !menuOpen;
      menu.classList.toggle('hidden', !menuOpen);
    };
  }

  overlay.addEventListener('click', (e) => {
    if (menuOpen && !e.target.closest('[data-ivr-edit]') && !e.target.closest('[data-ivr-menu]')) {
      menuOpen = false;
      menu.classList.add('hidden');
    }
  });

  const replaceBtn = overlay.querySelector('[data-ivr-replace]');
  if (replaceBtn) {
    replaceBtn.onclick = () => {
      menuOpen = false;
      menu.classList.add('hidden');
      fileInput.click();
    };
    fileInput.onchange = () => {
      if (fileInput.files.length) {
        onReplace(fileInput.files[0]);
        close();
      }
    };
  }

  const deleteBtn = overlay.querySelector('[data-ivr-delete]');
  if (deleteBtn) {
    deleteBtn.onclick = () => {
      menuOpen = false;
      menu.classList.add('hidden');
      if (confirm('Delete this image?')) {
        onDelete();
        close();
      }
    };
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }
}
