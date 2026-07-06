const TOAST_DURATION = 4000;

const styles = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-binos-blue',
};

let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = 'info', duration = TOAST_DURATION) {
  const el = document.createElement('div');
  el.className = `${styles[type] || styles.info} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium pointer-events-auto animate-slideInRight flex items-center gap-2 max-w-sm`;
  el.innerHTML = message;
  getContainer().appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

export const toast = {
  success: (msg, dur) => showToast(msg, 'success', dur),
  error: (msg, dur) => showToast(msg, 'error', dur),
  info: (msg, dur) => showToast(msg, 'info', dur),
};
