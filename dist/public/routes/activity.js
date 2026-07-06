import { apiClient, formatRelativeTime, escHtml } from '../lib/utils.js';
import { toast } from '../lib/toast.js';

export function renderActivity(container) {
  let activities = [];
  let total = 0;
  let loading = true;
  let showClearConfirm = false;

  const ACTION_ICONS = {
    create: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>',
    update: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>',
    delete: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>',
    login: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>',
  };
  const ACTION_COLORS = { create: 'bg-green-100 text-green-600', update: 'bg-blue-100 text-blue-600', delete: 'bg-red-100 text-red-600', login: 'bg-purple-100 text-purple-600' };

  async function loadData() {
    try {
      loading = true;
      const data = await apiClient.get('/activity');
      activities = Array.isArray(data) ? data : [];
      total = activities.length;
    } catch (e) { toast.error('Failed to load activity'); }
    loading = false;
    render();
  }

  async function clearAll() {
    try { await apiClient.del('/activity'); } catch (e) { toast.error('Failed to clear activity'); }
    showClearConfirm = false;
    loadData();
  }

  function render() {
    let html = '<div class="space-y-6">';
    html += '<div class="flex items-center justify-between"><h2 class="page-title">Activity Feed</h2>' +
      '<div class="flex gap-2"><button class="btn-secondary btn-sm" data-refresh>Refresh</button>' +
      '<button class="btn-danger btn-sm" data-clear-all>Clear All</button></div></div>';

    if (loading) {
      html += '<div class="space-y-3">' + Array(8).fill('').map(() =>
        '<div class="card p-4 flex items-center gap-3"><div class="w-8 h-8 rounded-full skeleton"></div><div class="flex-1"><div class="skeleton-text mb-1"></div><div class="skeleton-text w-1/3"></div></div></div>'
      ).join('') + '</div>';
    } else if (activities.length === 0) {
      html += '<div class="p-8 text-center text-binos-gray bg-gray-50 rounded-lg">No activity recorded</div>';
    } else {
      html += '<div class="space-y-3">';
      activities.forEach(a => {
        const action = a.action || 'update';
        const icon = ACTION_ICONS[action] || ACTION_ICONS.update;
        const color = ACTION_COLORS[action] || ACTION_COLORS.update;
        const entityType = (a.entity_type || '').replace(/_/g, ' ');
        html += '<div class="card p-4 flex items-center gap-3">' +
          '<div class="w-8 h-8 rounded-full flex items-center justify-center ' + color + '">' + icon + '</div>' +
          '<div class="flex-1 min-w-0"><div class="text-sm"><span class="font-medium">' + (action.charAt(0).toUpperCase() + action.slice(1)) + '</span> ' +
          '<span class="text-binos-gray">' + entityType + '</span>' +
          (a.entity_label ? ' <span class="font-medium">' + escHtml(a.entity_label) + '</span>' : '') + '</div>' +
          '<div class="text-xs text-binos-gray mt-0.5">' + formatRelativeTime(a.created_at) +
          (a.actor ? ' &middot; ' + escHtml(a.actor.substring(0, 20)) : '') + '</div></div></div>';
      });
      html += '</div>';
    }

    if (showClearConfirm) {
      html += '<div class="modal-overlay" data-close-modal><div class="modal-content max-w-md" onclick="event.stopPropagation()"><div class="p-6 text-center">' +
        '<h3 class="font-semibold mb-2">Clear All Activity?</h3><p class="text-sm text-binos-gray mb-4">This cannot be undone.</p>' +
        '<div class="flex gap-3 justify-center"><button class="btn-secondary btn-sm" data-close-modal>Cancel</button>' +
        '<button class="btn-danger btn-sm" data-confirm-clear>Clear</button></div></div></div></div>';
    }

    html += '</div>';
    container.innerHTML = html;
    attachEvents();
  }

  function attachEvents() {
    container.querySelector('[data-refresh]')?.addEventListener('click', loadData);
    container.querySelector('[data-clear-all]')?.addEventListener('click', () => { showClearConfirm = true; render(); });
    container.querySelector('[data-confirm-clear]')?.addEventListener('click', clearAll);
    container.querySelectorAll('[data-close-modal]').forEach(el => {
      el.onclick = () => { showClearConfirm = false; render(); };
    });
  }

  loadData();
}
