import { apiClient, formatDate, escHtml } from '../lib/utils.js';
import { toast } from '../lib/toast.js';

export function renderTasks(container) {
  let items = [];
  let filter = 'all';
  let editingId = null;
  let form = { title: '', description: '', priority: 'medium', due_date: '' };
  let confirmDelete = null;
  let selected = new Set();
  let confirmBulkDelete = false;
  let loading = true;

  async function loadData() {
    try {
      loading = true;
      const data = await apiClient.get('/tasks');
      items = Array.isArray(data) ? data : [];
    } catch (e) { toast.error('Failed to load tasks'); }
    loading = false;
    render();
  }

  function filtered() {
    if (filter === 'all') return items;
    return items.filter(i => i.status === filter);
  }

  function cycleStatus(item) {
    const order = ['pending', 'in_progress', 'done'];
    const idx = order.indexOf(item.status);
    item.status = order[(idx + 1) % order.length];
    apiClient.put('/tasks/' + item.id, { status: item.status });
  }

  function statusIcon(s) {
    if (s === 'done') return '<svg class="w-5 h-5 text-binos-green" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
    if (s === 'in_progress') return '<svg class="w-5 h-5 text-binos-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-width="2" d="M12 6v6l4 2"/></svg>';
    return '<svg class="w-5 h-5 text-binos-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/></svg>';
  }

  function priorityBadge(p) {
    const c = p === 'high' ? 'badge-red' : p === 'medium' ? 'badge-orange' : 'badge-green';
    return '<span class="badge ' + c + '">' + p + '</span>';
  }

  async function saveTask() {
    if (!form.title) return;
    if (editingId) {
      await apiClient.put('/tasks/' + editingId, form);
    } else {
      await apiClient.post('/tasks', { ...form, status: 'pending' });
    }
    editingId = null;
    form = { title: '', description: '', priority: 'medium', due_date: '' };
    loadData();
  }

  function editTask(item) {
    editingId = item.id;
    form = { title: item.title, description: item.description || '', priority: item.priority || 'medium', due_date: item.due_date || '' };
    render();
  }

  async function deleteTask(id) {
    try {
      await apiClient.del('/tasks/' + id);
      confirmDelete = null;
      loadData();
    } catch (e) { toast.error('Failed to delete task'); }
  }

  async function bulkDelete() {
    try {
      await Promise.allSettled(Array.from(selected).map(id => apiClient.del('/tasks/' + id)));
      selected.clear();
      confirmBulkDelete = false;
      loadData();
    } catch (e) { toast.error('Failed to bulk delete tasks'); }
  }

  function render() {
    const list = filtered();
    let html = '<div class="space-y-6">';

    html += '<div class="card p-4"><div class="grid grid-cols-1 md:grid-cols-4 gap-3">' +
      '<input class="input-field md:col-span-2" placeholder="Task title" data-form-title value="' + escHtml(form.title) + '">' +
      '<select class="select-field" data-form-priority>' +
      ['low','medium','high'].map(p => '<option value="' + p + '"' + (form.priority === p ? ' selected' : '') + '>' + p + '</option>').join('') + '</select>' +
      '<input class="input-field" type="date" data-form-due value="' + (form.due_date || '') + '">' +
      '<textarea class="input-field md:col-span-2" placeholder="Description" data-form-desc rows="2">' + escHtml(form.description) + '</textarea>' +
      '<div class="flex gap-2"><button class="btn-primary btn-sm" data-save-task>' + (editingId ? 'Update' : 'Add Task') + '</button>' +
      (editingId ? '<button class="btn-secondary btn-sm" data-cancel-edit>Cancel</button>' : '') + '</div></div></div>';

    html += '<div class="tab-bar">' +
      ['all','pending','in_progress','done'].map(f =>
        '<button class="' + (filter === f ? 'tab-item-active' : 'tab-item-inactive') + '" data-filter="' + f + '">' + f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) + '</button>'
      ).join('') + '</div>';

    if (selected.size > 0) {
      html += '<div class="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">' +
        '<span class="text-sm text-red-700">' + selected.size + ' selected</span>' +
        '<button class="btn-danger btn-sm" data-bulk-delete>Delete Selected</button>' +
        '<button class="btn-secondary btn-sm" data-clear-selection>Clear</button></div>';
    }

    if (loading) {
      html += '<div class="flex items-center justify-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-binos-blue"></div></div>';
    } else if (list.length === 0) {
      html += '<div class="p-8 text-center text-binos-gray bg-gray-50 rounded-lg">No tasks found</div>';
    } else {
      html += '<div class="space-y-3">';
      list.forEach(item => {
        html += '<div class="card p-4 flex items-center gap-3">' +
          '<input type="checkbox" class="w-4 h-4 rounded border-binos-border" data-toggle-select="' + item.id + '"' + (selected.has(item.id) ? ' checked' : '') + '>' +
          '<button data-cycle="' + item.id + '" class="flex-shrink-0">' + statusIcon(item.status) + '</button>' +
          '<div class="flex-1 min-w-0"><div class="font-medium text-sm">' + escHtml(item.title) + '</div>' +
          (item.description ? '<div class="text-xs text-binos-gray truncate">' + escHtml(item.description) + '</div>' : '') +
          '<div class="flex items-center gap-2 mt-1 text-xs text-binos-gray">' + priorityBadge(item.priority) +
          (item.due_date ? '<span>Due: ' + formatDate(item.due_date) + '</span>' : '') +
          '<span>Created: ' + formatDate(item.created_at) + '</span></div></div>' +
          '<div class="flex gap-1"><button class="p-1.5 rounded hover:bg-binos-light" data-edit="' + item.id + '"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>' +
          '<button class="p-1.5 rounded hover:bg-binos-light text-binos-red" data-delete="' + item.id + '"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></div></div>';
      });
      html += '</div>';
    }

    if (confirmDelete) {
      html += '<div class="modal-overlay" data-close-modal><div class="modal-content max-w-md" onclick="event.stopPropagation()"><div class="p-6 text-center">' +
        '<h3 class="font-semibold mb-2">Delete Task?</h3><p class="text-sm text-binos-gray mb-4">This action cannot be undone.</p>' +
        '<div class="flex gap-3 justify-center"><button class="btn-secondary btn-sm" data-close-modal>Cancel</button>' +
        '<button class="btn-danger btn-sm" data-confirm-delete>Delete</button></div></div></div></div>';
    }

    html += '</div>';
    container.innerHTML = html;
    attachEvents();
  }

  function attachEvents() {
    container.querySelectorAll('[data-filter]').forEach(btn => {
      btn.onclick = () => { filter = btn.dataset.filter; render(); };
    });
    container.querySelector('[data-save-task]')?.addEventListener('click', () => {
      form.title = container.querySelector('[data-form-title]').value;
      form.description = container.querySelector('[data-form-desc]').value;
      form.priority = container.querySelector('[data-form-priority]').value;
      form.due_date = container.querySelector('[data-form-due]').value;
      saveTask();
    });
    container.querySelector('[data-cancel-edit]')?.addEventListener('click', () => {
      editingId = null;
      form = { title: '', description: '', priority: 'medium', due_date: '' };
      render();
    });
    container.querySelectorAll('[data-cycle]').forEach(btn => {
      btn.onclick = () => { const item = items.find(i => i.id === btn.dataset.cycle); if (item) cycleStatus(item); render(); };
    });
    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.onclick = () => { const item = items.find(i => i.id === btn.dataset.edit); if (item) editTask(item); };
    });
    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.onclick = () => { confirmDelete = btn.dataset.delete; render(); };
    });
    container.querySelector('[data-confirm-delete]')?.addEventListener('click', () => { if (confirmDelete) deleteTask(confirmDelete); });
    container.querySelectorAll('[data-toggle-select]').forEach(cb => {
      cb.onchange = () => {
        const id = cb.dataset.toggleSelect;
        if (cb.checked) selected.add(id); else selected.delete(id);
        render();
      };
    });
    container.querySelector('[data-bulk-delete]')?.addEventListener('click', () => bulkDelete());
    container.querySelector('[data-clear-selection]')?.addEventListener('click', () => { selected.clear(); render(); });
    container.querySelectorAll('[data-close-modal]').forEach(el => {
      el.onclick = () => { confirmDelete = null; confirmBulkDelete = false; render(); };
    });
  }

  loadData();
}
