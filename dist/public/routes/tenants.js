import { apiClient, formatDate, escHtml } from '../lib/utils.js';
import { ICONS } from '../lib/icons.js';
import { openImageViewer } from '../lib/image-viewer.js';
import { toast } from '../lib/toast.js';

export function renderTenants(container) {
  let state = {
    tenants: [],
    filterProp: 'all',
    showForm: false,
    editingId: null,
    inspectModal: null,
    form: {
      name: '', phone: '', email: '', property_id: null,
      lease_start: '', lease_end: '', lease_file: '', notes: '',
    },
    inspectForm: { date: '', notes: '', type: 'report' },
    page: 1,
    pageSize: 10,
    loading: true,
    error: null,
    properties: [],
  };

  async function loadData() {
    try {
      state.loading = true;
      state.error = null;
      const [td, pd] = await Promise.all([
        apiClient.get('/tenants'),
        apiClient.get('/properties'),
      ]);
      state.tenants = Array.isArray(td) ? td : [];
      state.properties = pd || [];
      state.loading = false;
      rerender();
    } catch (err) {
      state.error = err.message;
      state.loading = false;
      rerender();
    }
  }

  function getFiltered() {
    return state.tenants.filter(t =>
      (state.filterProp === 'all' || t.property_id == state.filterProp)
    );
  }

  function getPaginated() {
    const f = getFiltered();
    const s = (state.page - 1) * state.pageSize;
    return {
      items: f.slice(s, s + state.pageSize),
      total: f.length,
      hasPrev: state.page > 1,
      hasNext: state.page * state.pageSize < f.length,
    };
  }

  function propName(id) {
    return state.properties.find(p => p.id == id)?.scheme_name || 'Unknown';
  }

  function tenantCard(t) {
    const now = Date.now();
    const start = t.lease_start ? new Date(t.lease_start).getTime() : null;
    const end = t.lease_end ? new Date(t.lease_end).getTime() : null;
    const active = end ? now < end : true;
    const inpCount = (t.inspection_reports || []).length;
    const imgCount = (t.inspection_images || []).length;

    return '<div class="card p-4 hover:shadow-card-hover transition-shadow">' +
      '<div class="flex items-start justify-between mb-3">' +
      '<div class="flex items-center gap-3">' +
      '<div class="w-10 h-10 rounded-full bg-binos-green/10 flex items-center justify-center">' +
      '<svg class="w-5 h-5 text-binos-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>' +
      '</div><div><h3 class="font-medium leading-tight">' + escHtml(t.name) + '</h3>' +
      '<div class="text-xs text-binos-gray">' + propName(t.property_id) + '</div></div></div>' +
      '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + (active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') + '">' + (active ? 'Active' : 'Expired') + '</span>' +
      '</div>' +
      '<div class="space-y-1.5 text-sm">' +
      (t.phone ? '<div class="flex items-center gap-2 text-binos-gray"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg><a href="tel:' + escHtml(t.phone) + '" class="hover:text-binos-blue">' + escHtml(t.phone) + '</a></div>' : '') +
      (t.email ? '<div class="flex items-center gap-2 text-binos-gray"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg><a href="mailto:' + escHtml(t.email) + '" class="hover:text-binos-blue truncate">' + escHtml(t.email) + '</a></div>' : '') +
      (t.lease_start || t.lease_end ? '<div class="flex items-center gap-2 text-binos-gray"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><span>' + formatDate(t.lease_start) + ' — ' + formatDate(t.lease_end) + '</span></div>' : '') +
      '</div>' +
      '<div class="mt-3 flex items-center gap-3 border-t border-binos-border/50 pt-3">' +
      (t.lease_file ? '<a href="' + escHtml(t.lease_file) + '" target="_blank" class="inline-flex items-center gap-1 text-xs text-binos-gray hover:text-binos-blue"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Lease</a>' : '') +
      '<button class="inline-flex items-center gap-1 text-xs text-binos-gray hover:text-binos-blue" data-inspect-modal=\'' + JSON.stringify({ id: t.id, type: 'reports' }) + '\'><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' + inpCount + '</button>' +
      '<button class="inline-flex items-center gap-1 text-xs text-binos-gray hover:text-binos-blue" data-inspect-modal=\'' + JSON.stringify({ id: t.id, type: 'images' }) + '\'><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' + imgCount + '</button>' +
      '</div>' +
      '<div class="mt-3 flex gap-2"><button class="btn-secondary btn-sm py-1.5 px-3" data-edit-tenant="' + t.id + '">Edit</button>' +
      '<button class="btn-danger btn-sm py-1.5 px-3" data-delete-tenant="' + t.id + '">Delete</button></div></div>';
  }

  function renderInspectModal() {
    if (!state.inspectModal) return '';
    const tenant = state.tenants.find(t => t.id == state.inspectModal.id);
    if (!tenant) return '';
    const isImage = state.inspectModal.type === 'images';
    const items = tenant['inspection_' + state.inspectModal.type] || [];
    const label = isImage ? 'Images' : 'Reports';

    let html = '<div class="modal-overlay" data-close-inspect>' +
      '<div class="modal-content max-w-lg" onclick="event.stopPropagation()">' +
      '<div class="card-header flex items-center justify-between"><h3 class="font-display font-semibold">' + escHtml(tenant.name) + ' — Inspection ' + label + '</h3>' +
      '<button class="p-1.5 rounded-lg hover:bg-binos-light" data-close-inspect><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>' +
      '<div class="card-body max-h-[70vh] overflow-y-auto">';

    if (items.length === 0) {
      html += '<div class="text-center py-8 text-binos-gray">No inspection ' + label.toLowerCase() + ' yet</div>';
    } else if (isImage) {
      html += '<div class="grid grid-cols-2 gap-3">' + items.map(item =>
        '<div class="relative"><img src="' + escHtml(item.url) + '" class="w-full h-32 object-cover rounded-lg border cursor-pointer" data-tenant-img=\'' + JSON.stringify({ id: tenant.id, url: item.url }) + '\'>' +
        (item.date ? '<div class="text-xs text-binos-gray mt-1">' + formatDate(item.date) + '</div>' : '') +
        '<button class="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs" data-del-inspect=\'' + JSON.stringify({ id: tenant.id, type: state.inspectModal.type, url: item.url }) + '\'>x</button></div>'
      ).join('') + '</div>';
    } else {
      html += '<div class="space-y-2">' + items.map(item =>
        '<div class="card p-3 flex items-center justify-between">' +
        '<div class="flex items-center gap-3 min-w-0"><svg class="w-5 h-5 text-binos-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
        '<span class="text-sm truncate">' + (item.name || item.url.split('/').pop() || 'file') + '</span></div>' +
        '<div class="flex gap-1">' +
        '<a href="' + escHtml(item.url) + '" target="_blank" class="p-1.5 rounded-lg hover:bg-binos-light"><svg class="w-4 h-4 text-binos-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></a>' +
        '<button class="p-1.5 rounded-lg hover:bg-red-50" data-del-inspect=\'' + JSON.stringify({ id: tenant.id, type: state.inspectModal.type, url: item.url }) + '\'><svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>' +
        '</div></div>'
      ).join('') + '</div>';
    }

    html += '<div class="mt-4 pt-4 border-t border-binos-border">' +
      '<div class="grid grid-cols-2 gap-3 mb-3">' +
      '<div><label class="block text-xs text-binos-gray mb-1">Date</label><input type="date" class="input-field text-sm" data-inspect-date value="' + state.inspectForm.date + '"></div>' +
      '<div><label class="block text-xs text-binos-gray mb-1">Notes</label><input type="text" class="input-field text-sm" data-inspect-notes value="' + escHtml(state.inspectForm.notes) + '"></div></div>' +
      '<label class="btn-primary btn-sm cursor-pointer inline-flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> Upload ' + label.slice(0, -1) +
      '<input type="file" accept="' + (isImage ? 'image/*' : '.pdf,.doc,.docx') + '" class="hidden" data-upload-inspect=\'' + JSON.stringify({ id: tenant.id, type: state.inspectModal.type }) + '\'></label></div>' +
      '</div></div></div>';
    return html;
  }

  function showForm(id) {
    if (id) {
      const t = state.tenants.find(x => x.id === id);
      if (t) {
        state.editingId = id;
        state.form = { name: t.name, phone: t.phone || '', email: t.email || '', property_id: t.property_id || null, lease_start: t.lease_start || '', lease_end: t.lease_end || '', lease_file: t.lease_file || '', notes: t.notes || '' };
      }
    } else {
      state.editingId = null;
      state.form = { name: '', phone: '', email: '', property_id: null, lease_start: '', lease_end: '', lease_file: '', notes: '' };
    }
    state.showForm = true;
    rerender();
  }

  function closeForm() {
    state.showForm = false;
    state.editingId = null;
    rerender();
  }

  async function saveTenant() {
    if (!state.form.name) return;
    try {
      if (state.editingId) {
        await apiClient.put('/tenants/' + state.editingId, state.form);
      } else {
        await apiClient.post('/tenants', state.form);
      }
      closeForm();
      await loadData();
    } catch (err) {
      toast.error('Failed to save tenant');
    }
  }

  function deleteTenant(id) {
    if (!confirm('Delete this tenant? It will be marked as inactive.')) return;
    apiClient.put('/tenants/' + id, { active: false }).then(() => loadData()).catch(() => toast.error('Failed to delete tenant'));
  }

  async function uploadInspect(id, type, file) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      fd.append('date', state.inspectForm.date || new Date().toISOString().split('T')[0]);
      fd.append('notes', state.inspectForm.notes || '');
      await fetch('/api/tenants/' + id + '/inspection', { method: 'POST', body: fd });
      await loadData();
    } catch (e) { toast.error('Upload failed'); }
  }

  async function deleteInspect(id, type, url) {
    try {
      await apiClient.put('/tenants/' + id + '/inspection', { type, url, active: false });
      await loadData();
    } catch (e) { toast.error('Failed to delete inspection item'); }
  }

  function rerender() {
    const p = getPaginated();
    const props = state.properties;

    let html = '<div class="flex flex-col h-full">' +
      (state.loading ? '<div class="flex items-center justify-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-binos-blue"></div></div>' : '') +
      (state.error ? '<div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mx-5 mt-5"><div class="font-medium mb-1">Error</div><div class="text-sm">' + state.error + '</div></div>' : '');

    if (!state.loading && !state.error) {
      html += '<div class="px-5 py-4 border-b border-binos-border bg-white">' +
        '<div class="flex flex-wrap items-center justify-between gap-4">' +
        '<div class="flex flex-wrap items-center gap-3">' +
        '<select class="select-field py-2 pr-8 text-sm" onchange="(e => { state.filterProp = e.target.value; state.page = 1; rerender(); })(event)">' +
        '<option value="all">All Properties</option>' +
        props.map(p => '<option value="' + p.id + '" ' + (state.filterProp == p.id ? 'selected' : '') + '>' + escHtml(p.scheme_name) + '</option>').join('') + '</select></div>' +
        '<button class="btn-primary btn-sm" data-add-tenant><span class="mr-1">' + ICONS.plus + '</span> Add Tenant</button></div></div>' +
        '<div class="flex-1 overflow-auto"><div class="p-5">' +
        (p.items.length === 0 ? '<div class="p-8 bg-gray-50 rounded-lg border text-center"><div class="text-binos-gray">No tenants found</div></div>' :
        '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">' + p.items.map(tenantCard).join('') + '</div>') +
        '</div></div>' +
        (p.total > 0 ? '<div class="px-5 py-4 border-t border-binos-border bg-white flex items-center justify-between text-sm">' +
        '<span class="text-binos-gray">Showing ' + ((state.page - 1) * state.pageSize + 1) + '-' + Math.min(state.page * state.pageSize, p.total) + ' of ' + p.total + '</span>' +
        '<div class="flex gap-2"><button class="btn-secondary btn-sm" ' + (!p.hasPrev ? 'disabled' : '') + ' onclick="(e => { if (state.page > 1) { state.page--; rerender(); } })(event)">Previous</button>' +
        '<button class="btn-secondary btn-sm" ' + (!p.hasNext ? 'disabled' : '') + ' onclick="(e => { if (state.page * state.pageSize < p.total) { state.page++; rerender(); } })(event)">Next</button></div></div>' : '');
    }

    html += renderFormModal() + renderInspectModal() + '</div>';
    container.innerHTML = html;
    attachEvents();
  }

  function renderFormModal() {
    if (!state.showForm) return '';
    return '<div class="modal-overlay" data-close-form><div class="modal-content max-w-lg" onclick="event.stopPropagation()">' +
      '<div class="card-header flex items-center justify-between"><h3 class="font-display font-semibold">' + (state.editingId ? 'Edit Tenant' : 'Add Tenant') + '</h3>' +
      '<button class="p-1.5 rounded-lg hover:bg-binos-light" data-close-form><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>' +
      '<div class="card-body"><div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<div class="md:col-span-2"><label class="block text-sm font-medium text-binos-gray mb-1.5">Name *</label><input type="text" class="input-field" value="' + escHtml(state.form.name) + '" onchange="(e => { state.form.name = e.target.value; rerender(); })(event)"></div>' +
      '<div><label class="block text-sm font-medium text-binos-gray mb-1.5">Phone</label><input type="tel" class="input-field" value="' + escHtml(state.form.phone) + '" onchange="(e => { state.form.phone = e.target.value; rerender(); })(event)"></div>' +
      '<div><label class="block text-sm font-medium text-binos-gray mb-1.5">Email</label><input type="email" class="input-field" value="' + escHtml(state.form.email) + '" onchange="(e => { state.form.email = e.target.value; rerender(); })(event)"></div>' +
      '<div><label class="block text-sm font-medium text-binos-gray mb-1.5">Lease Start</label><input type="date" class="input-field" value="' + state.form.lease_start + '" onchange="(e => { state.form.lease_start = e.target.value; rerender(); })(event)"></div>' +
      '<div><label class="block text-sm font-medium text-binos-gray mb-1.5">Lease End</label><input type="date" class="input-field" value="' + state.form.lease_end + '" onchange="(e => { state.form.lease_end = e.target.value; rerender(); })(event)"></div>' +
      '<div><label class="block text-sm font-medium text-binos-gray mb-1.5">Property</label>' +
      '<select class="select-field" onchange="(e => { state.form.property_id = e.target.value || null; rerender(); })(event)">' +
      '<option value="">Select property</option>' +
      state.properties.map(p => '<option value="' + p.id + '" ' + (state.form.property_id == p.id ? 'selected' : '') + '>' + escHtml(p.scheme_name) + '</option>').join('') + '</select></div>' +
      '<div><label class="block text-sm font-medium text-binos-gray mb-1.5">Lease File URL</label><input type="url" class="input-field" placeholder="Link to lease doc in property-files" value="' + escHtml(state.form.lease_file) + '" onchange="(e => { state.form.lease_file = e.target.value; rerender(); })(event)"></div>' +
      '<div class="md:col-span-2"><label class="block text-sm font-medium text-binos-gray mb-1.5">Notes</label><textarea class="input-field min-h-[80px]" onchange="(e => { state.form.notes = e.target.value; rerender(); })(event)">' + escHtml(state.form.notes) + '</textarea></div>' +
      '</div><div class="flex gap-3 pt-6"><button class="btn-secondary flex-1" data-close-form>Cancel</button>' +
      '<button class="btn-primary flex-1" data-save-tenant ' + (!state.form.name ? 'disabled' : '') + '>Save</button></div></div></div></div>';
  }

  function attachEvents() {
    container.querySelectorAll('[data-close-inspect]').forEach(el => {
      el.onclick = () => { state.inspectModal = null; rerender(); };
    });
    container.querySelectorAll('[data-inspect-modal]').forEach(el => {
      el.onclick = () => {
        try { state.inspectModal = JSON.parse(el.getAttribute('data-inspect-modal')); state.inspectForm = { date: '', notes: '', type: 'report' }; rerender(); } catch {}
      };
    });
    container.querySelectorAll('[data-del-inspect]').forEach(el => {
      el.onclick = () => {
        try {
          const val = JSON.parse(el.getAttribute('data-del-inspect'));
          deleteInspect(val.id, val.type, val.url);
        } catch {}
      };
    });
    container.querySelectorAll('[data-upload-inspect]').forEach(el => {
      el.onchange = () => {
        if (!el.files.length) return;
        try {
          const val = JSON.parse(el.getAttribute('data-upload-inspect'));
          state.inspectForm.date = (container.querySelector('[data-inspect-date]')?.value) || '';
          state.inspectForm.notes = (container.querySelector('[data-inspect-notes]')?.value) || '';
          for (const f of el.files) uploadInspect(val.id, val.type, f);
          el.value = '';
        } catch {}
      };
    });
    container.querySelectorAll('[data-edit-tenant]').forEach(el => {
      el.onclick = () => showForm(parseInt(el.getAttribute('data-edit-tenant')) || el.getAttribute('data-edit-tenant'));
    });
    container.querySelectorAll('[data-delete-tenant]').forEach(el => {
      el.onclick = () => deleteTenant(el.getAttribute('data-delete-tenant'));
    });
    container.querySelectorAll('[data-add-tenant]').forEach(el => {
      el.onclick = () => showForm(null);
    });
    container.querySelectorAll('[data-close-form]').forEach(el => {
      el.onclick = () => closeForm();
    });
    container.querySelectorAll('[data-save-tenant]').forEach(el => {
      el.onclick = () => saveTenant();
    });
    container.querySelectorAll('[data-tenant-img]').forEach(el => {
      el.onclick = () => {
        try {
          const val = JSON.parse(el.getAttribute('data-tenant-img'));
          openImageViewer({
            url: val.url,
            onReplace(newFile) { uploadInspect(val.id, 'images', newFile); },
            onDelete() { deleteInspect(val.id, 'images', val.url); },
          });
        } catch {}
      };
    });
  }

  loadData();
}
