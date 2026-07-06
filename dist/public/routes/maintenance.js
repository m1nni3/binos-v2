import { apiClient, formatDate, formatCurrency, escHtml } from '../lib/utils.js';
import { openImageViewer } from '../lib/image-viewer.js';
import { toast } from '../lib/toast.js';

export function renderMaintenance(container) {
  let data = [];
  let selectedItem = null;
  let detailView = 'view';
  let filterProp = 'all';
  let filterCategory = 'all';
  let currentPage = 1;
  const itemsPerPage = 10;
  let loading = true;
  let error = null;
  let properties = [];
  let fileModal = null;
  let uploadQueue = {};

  const CATEGORIES = {
    roof: { color: 'blue', label: 'Roof' },
    plumbing: { color: 'cyan', label: 'Plumbing' },
    electrical: { color: 'yellow', label: 'Electrical' },
    hvac: { color: 'green', label: 'HVAC' },
    painting: { color: 'pink', label: 'Painting' },
    flooring: { color: 'orange', label: 'Flooring' },
    windows: { color: 'purple', label: 'Windows' },
  };

  function catInfo(c) { return CATEGORIES[c] || { color: 'gray', label: c }; }
  function propName(id) { return properties.find(p => p.id === id)?.scheme_name || 'Unknown'; }

  function filtered() {
    return data.filter(i =>
      (filterProp === 'all' || i.property_id === filterProp) &&
      (filterCategory === 'all' || i.category === filterCategory)
    );
  }

  function paginated() {
    const f = filtered(), s = (currentPage - 1) * itemsPerPage;
    const items = f.slice(s, s + itemsPerPage);
    return { items, total: f.length, hasPrev: currentPage > 1, hasNext: currentPage * itemsPerPage < f.length };
  }

  function statusBadge(s) {
    const cls = s === 'completed' ? 'bg-green-100 text-green-800' : s === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800';
    return '<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ' + cls + '">' + s.replace('_', ' ') + '</span>';
  }

  function renderCard(item) {
    const ci = catInfo(item.category), pn = propName(item.property_id), sel = selectedItem === item.id;
    const imgCount = (item.images || []).length;
    const repCount = (item.reports || []).length;
    const invCount = (item.invoices || []).length;
    return '<div class="card p-4 cursor-pointer transition-all ' + (sel ? 'ring-2 ring-binos-blue shadow-card-hover' : '') + '" data-select="' + item.id + '">' +
      '<div class="flex items-start justify-between mb-3"><div class="flex items-center gap-2">' +
      '<div class="w-8 h-8 rounded-full bg-' + ci.color + '-100 flex items-center justify-center text-' + ci.color + '-700">' +
      '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>' +
      '</div><div><h3 class="font-medium text-base leading-tight mb-1">' + escHtml(item.title) + '</h3>' +
      '<div class="text-xs text-binos-gray">' + pn + '</div></div></div>' +
      '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-' + ci.color + '-100 text-' + ci.color + '-800">' + ci.label + '</span></div>' +
      '<div class="space-y-2 text-sm">' +
      '<div class="flex items-center gap-2 text-binos-gray"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-8 8h8m-8 4h8m-5 4h6m2.598-9.237a2 2 0 00-2.653-.147l-5.5 4.5a2 2 0 000 3.174l5.5 4.5a2 2 0 002.653-.147l4.902-4.902a2 2 0 000-2.828L15.498 7.237z"/></svg>' + formatDate(item.date) + '</div>' +
      '<div class="flex items-center gap-2 text-binos-gray"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>' + escHtml(item.location) + '</div>' +
      (item.priority === 'high' ? '<div class="flex items-center gap-2 text-red-700"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4.716c-.746-1.333-2.694-1.333-3.44 0L3.268 16.284c-.77 1.333.192 3 1.732 3z"/></svg><span class="text-xs font-medium">High Priority</span></div>' : '') +
      '</div>' +
      '<div class="mt-3 flex items-center gap-3 border-t border-binos-border/50 pt-3">' +
      '<button class="inline-flex items-center gap-1 text-xs text-binos-gray hover:text-binos-blue transition-colors" data-file-modal=\'{"id":"' + item.id + '","type":"images"}\'>' +
      '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' + imgCount + '</button>' +
      '<button class="inline-flex items-center gap-1 text-xs text-binos-gray hover:text-binos-blue transition-colors" data-file-modal=\'{"id":"' + item.id + '","type":"reports"}\'>' +
      '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' + repCount + '</button>' +
      '<button class="inline-flex items-center gap-1 text-xs text-binos-gray hover:text-binos-blue transition-colors" data-file-modal=\'{"id":"' + item.id + '","type":"invoices"}\'>' +
      '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>' + invCount + '</button>' +
      '</div></div>';
  }

  function renderFileModal() {
    if (!fileModal) return '';
    const item = data.find(i => i.id == fileModal.id);
    if (!item) return '';
    const files = item[fileModal.type] || [];
    const typeLabel = fileModal.type === 'images' ? 'Images' : fileModal.type === 'reports' ? 'Reports' : 'Invoices';
    const acceptType = fileModal.type === 'images' ? 'image/*' : '.pdf,.doc,.docx,.xls,.xlsx';
    const isImage = fileModal.type === 'images';

    let html = '<div class="modal-overlay" data-close-modal>' +
      '<div class="modal-content max-w-lg" onclick="event.stopPropagation()">' +
      '<div class="card-header flex items-center justify-between"><h3 class="font-display font-semibold">' + escHtml(item.title) + ' — ' + typeLabel + '</h3>' +
      '<button class="p-1.5 rounded-lg hover:bg-binos-light" data-close-modal><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>' +
      '<div class="card-body max-h-[70vh] overflow-y-auto">';

    if (files.length === 0) {
      html += '<div class="text-center py-8 text-binos-gray">No ' + typeLabel.toLowerCase() + ' uploaded yet</div>';
    } else {
      if (isImage) {
        html += '<div class="grid grid-cols-2 gap-3">';
        files.forEach((f, i) => {
          html += '<div class="relative group"><img src="' + escHtml(f.url) + '" class="w-full h-32 object-cover rounded-lg border border-binos-border cursor-pointer" data-file-view=\'' + JSON.stringify({ idx: i, type: fileModal.type, id: item.id }) + '\">' +
            '<div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">' +
            '<button class="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-binos-light" data-file-view=\'' + JSON.stringify({ idx: i, type: fileModal.type, id: item.id }) + '\'><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>' +
            '<button class="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-binos-light" data-file-download=\'' + JSON.stringify({ idx: i, type: fileModal.type, id: item.id }) + '\'><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></button>' +
            '<button class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600" data-file-delete=\'' + JSON.stringify({ idx: i, type: fileModal.type, id: item.id }) + '\'><svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>' +
            '</div></div>';
        });
        html += '</div>';
      } else {
        html += '<div class="space-y-2">';
        files.forEach((f, i) => {
          const name = f.name || f.url.split('/').pop() || 'file-' + (i + 1);
          html += '<div class="card p-3 flex items-center justify-between">' +
            '<div class="flex items-center gap-3 min-w-0"><svg class="w-5 h-5 text-binos-gray flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
            '<span class="text-sm truncate">' + escHtml(name) + '</span></div>' +
            '<div class="flex gap-1 flex-shrink-0">' +
            '<button class="p-1.5 rounded-lg hover:bg-binos-light" data-file-view=\'' + JSON.stringify({ idx: i, type: fileModal.type, id: item.id }) + '\'><svg class="w-4 h-4 text-binos-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>' +
            '<button class="p-1.5 rounded-lg hover:bg-binos-light" data-file-download=\'' + JSON.stringify({ idx: i, type: fileModal.type, id: item.id }) + '\'><svg class="w-4 h-4 text-binos-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></button>' +
            '<button class="p-1.5 rounded-lg hover:bg-red-50" data-file-delete=\'' + JSON.stringify({ idx: i, type: fileModal.type, id: item.id }) + '\'><svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>' +
            '</div></div>';
        });
        html += '</div>';
      }
    }

    html += '<div class="mt-4 pt-4 border-t border-binos-border">' +
      '<label class="btn-primary btn-sm cursor-pointer inline-flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> Upload ' + typeLabel.slice(0, -1) +
      '<input type="file" accept="' + acceptType + '" ' + (fileModal.type === 'images' ? 'multiple' : '') + ' class="hidden" data-file-upload=\'' + JSON.stringify({ type: fileModal.type, id: item.id }) + '\'></label></div>' +
      '</div></div></div>';
    return html;
  }

  function renderDetail() {
    if (!selectedItem) return '';
    const item = data.find(i => i.id === selectedItem);
    if (!item) return '';
    const ci = catInfo(item.category);
    let html = '<div class="fixed inset-y-0 right-0 w-full lg:w-2/5 bg-white border-l border-binos-border shadow-xl z-30 flex flex-col">' +
      '<div class="flex items-center justify-between px-5 py-4 border-b border-binos-border"><div class="flex items-center gap-2">' +
      '<button class="p-1.5 rounded-lg hover:bg-binos-light" data-close-panel><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>' +
      '<h3 class="font-semibold text-lg">Maintenance Details</h3></div>' +
      '<div class="flex gap-2"><button class="btn-secondary btn-sm" data-view="view">Details</button>' +
      '<button class="btn-secondary btn-sm" data-view="images">Images</button>' +
      '<button class="btn-secondary btn-sm" data-view="reports">Reports</button>' +
      '<button class="btn-secondary btn-sm" data-view="invoices">Invoices</button></div></div>';

    if (detailView === 'view') {
      html += '<div class="flex-1 overflow-y-auto p-5">' +
        '<h2 class="font-semibold text-xl mb-2">' + escHtml(item.title) + '</h2>' +
        '<div class="flex flex-wrap gap-2 mb-4"><span class="badge bg-' + ci.color + '-100 text-' + ci.color + '-800">' + ci.label + '</span>' +
        '<span class="badge ' + (item.priority === 'high' ? 'badge-red' : 'badge-green') + '">' + item.priority + ' priority</span></div>' +
        '<div class="space-y-3 text-sm">' +
        '<div class="dl-row"><div class="dl-label">Property</div><div class="dl-value">' + propName(item.property_id) + '</div></div>' +
        '<div class="dl-row"><div class="dl-label">Date</div><div class="dl-value">' + formatDate(item.date) + '</div></div>' +
        '<div class="dl-row"><div class="dl-label">Location</div><div class="dl-value">' + escHtml(item.location) + '</div></div>' +
        '<div class="dl-row"><div class="dl-label">Description</div><div class="dl-value">' + escHtml(item.description) + '</div></div>' +
        '<div class="dl-row"><div class="dl-label">Technician</div><div class="dl-value">' + escHtml(item.technician || '') + '</div></div>' +
        '<div class="dl-row"><div class="dl-label">Cost</div><div class="dl-value amount-' + (item.cost > 0 ? 'negative' : 'neutral') + '">' + formatCurrency(item.cost) + '</div></div>' +
        '<div class="dl-row"><div class="dl-label">Status</div><div class="dl-value">' + statusBadge(item.status) + '</div></div>' +
        '</div></div>';
    } else {
      const fileType = detailView;
      const files = item[fileType] || [];
      const isImage = fileType === 'images';
      const typeLabel = fileType === 'images' ? 'Images' : fileType === 'reports' ? 'Reports' : 'Invoices';
      html += '<div class="flex-1 overflow-y-auto p-5"><h4 class="font-medium mb-3">' + typeLabel + '</h4>';
      if (files.length === 0) {
        html += '<div class="text-center py-8 text-binos-gray">No ' + typeLabel.toLowerCase() + ' uploaded yet</div>';
      } else if (isImage) {
        html += '<div class="grid grid-cols-2 gap-3">' + files.map((f, i) =>
          '<div class="relative"><img src="' + escHtml(f.url) + '" class="w-full h-32 object-cover rounded-lg border border-binos-border cursor-pointer" data-file-view=\'' + JSON.stringify({ idx: i, type: fileType, id: item.id }) + '\'>' +
          '<button class="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center" data-delete-file=\'' + JSON.stringify({ idx: i, type: fileType, id: item.id }) + '\'>x</button></div>'
        ).join('') + '</div>';
      } else {
        html += '<div class="space-y-2">' + files.map((f, i) => {
          const name = f.name || f.url.split('/').pop() || 'file-' + (i + 1);
          return '<div class="card p-3 flex items-center justify-between"><span class="text-sm truncate">' + escHtml(name) + '</span>' +
            '<button class="p-1.5 rounded-lg hover:bg-red-50" data-delete-file=\'' + JSON.stringify({ idx: i, type: fileType, id: item.id }) + '\'><svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>';
        }).join('') + '</div>';
      }
      const accept = isImage ? 'image/*' : '.pdf,.doc,.docx,.xls,.xlsx';
      html += '<label class="btn-add btn-sm mt-4 cursor-pointer inline-flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Upload ' + typeLabel.slice(0, -1) +
        '<input type="file" accept="' + accept + '" ' + (isImage ? 'multiple' : '') + ' class="hidden" data-panel-upload=\'' + JSON.stringify({ type: fileType, id: item.id }) + '\'></label>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  async function loadData() {
    try {
      loading = true; error = null;
      const [md, pd] = await Promise.all([apiClient.get('/maintenance'), apiClient.get('/properties')]);
      data = Array.isArray(md) ? md : [];
      properties = pd || [];
      loading = false;
    } catch (e) { error = e.message; loading = false; }
    render();
  }

  async function uploadFile(id, type, file) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      fd.append('maintenance_id', String(id));
      await fetch('/api/maintenance/' + id + '/files', { method: 'POST', body: fd });
      await loadData();
    } catch (e) {
      toast.error('Upload failed');
    }
  }

  async function deleteFile(id, type, idx) {
    try {
      const item = data.find(i => i.id == id);
      if (!item) return;
      const file = (item[type] || [])[idx];
      if (!file) return;
      await apiClient.put('/maintenance/' + id + '/files', { type, idx, active: false });
      const itemIdx = data.findIndex(i => i.id == id);
      if (itemIdx !== -1) {
        data[itemIdx][type].splice(idx, 1);
        render();
      }
    } catch (e) {
      toast.error('Failed to delete file');
    }
  }

  function render() {
    const p = paginated();
    let html = '<div class="flex h-full"><div class="w-full lg:w-2/5 border-r border-binos-border bg-white flex flex-col">' +
      '<div class="p-5 border-b border-binos-border bg-binos-light/50">' +
      '<h2 class="page-title">Maintenance</h2>' +
      '<div class="text-sm text-binos-gray mt-1">Track and manage property maintenance requests</div>' +
      '<div class="mt-4 flex flex-wrap gap-3">' +
      '<select class="select-field py-2 text-sm" data-filter-prop><option value="all">All Properties</option>' +
      properties.map(pr => '<option value="' + pr.id + '"' + (filterProp === pr.id ? ' selected' : '') + '>' + pr.scheme_name + '</option>').join('') + '</select>' +
      '<select class="select-field py-2 text-sm" data-filter-cat><option value="all">All Categories</option>' +
      ['roof','plumbing','electrical','hvac','painting','flooring','windows'].map(c => '<option value="' + c + '"' + (filterCategory === c ? ' selected' : '') + '>' + catInfo(c).label + '</option>').join('') + '</select>' +
      '</div></div>';

    if (loading) html += '<div class="flex items-center justify-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-binos-blue"></div></div>';
    else if (error) html += '<div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 m-5">' + error + '</div>';
    else {
      html += '<div class="flex-1 overflow-y-auto divide-y divide-binos-border/50">' + p.items.map(renderCard).join('') + '</div>';
      if (p.total > 0) html += '<div class="px-5 py-4 border-t border-binos-border flex items-center justify-between text-sm">' +
        '<span class="text-binos-gray">Showing ' + ((currentPage-1)*itemsPerPage+1) + '-' + Math.min(currentPage*itemsPerPage, p.total) + ' of ' + p.total + '</span>' +
        '<div class="flex gap-2"><button class="btn-secondary btn-sm" data-prev ' + (!p.hasPrev ? 'disabled' : '') + '>Previous</button>' +
        '<button class="btn-secondary btn-sm" data-next ' + (!p.hasNext ? 'disabled' : '') + '>Next</button></div></div>';
    }
    html += '</div><div class="hidden lg:block lg:w-3/5 relative">' + renderDetail() + '</div></div>' + renderFileModal();
    container.innerHTML = html;
    attachEvents();
  }

  function handleFileAction(el, attr) {
    const val = el.getAttribute(attr);
    if (!val) return null;
    try { return JSON.parse(val); } catch { return null; }
  }

  function attachEvents() {
    container.querySelectorAll('[data-select]').forEach(el => {
      el.onclick = () => { selectedItem = el.dataset.select; detailView = 'view'; render(); };
    });
    container.querySelectorAll('[data-close-panel]').forEach(el => {
      el.onclick = () => { selectedItem = null; render(); };
    });
    container.querySelectorAll('[data-view]').forEach(el => {
      el.onclick = () => { detailView = el.dataset.view; render(); };
    });
    container.querySelectorAll('[data-close-modal]').forEach(el => {
      el.onclick = () => { fileModal = null; render(); };
    });
    container.querySelectorAll('[data-file-modal]').forEach(el => {
      el.onclick = () => {
        const val = handleFileAction(el, 'data-file-modal');
        if (val) { fileModal = val; render(); }
      };
    });
    container.querySelectorAll('[data-file-view]').forEach(el => {
      el.onclick = () => {
        const val = handleFileAction(el, 'data-file-view');
        if (!val) return;
        const item = data.find(i => i.id == val.id);
        if (!item) return;
        const file = (item[val.type] || [])[val.idx];
        if (!file) return;
        if (val.type === 'images') {
          openImageViewer({
            url: file.url,
            name: file.name,
            onReplace(newFile) {
              uploadFile(val.id, val.type, newFile);
            },
            onDelete() {
              deleteFile(val.id, val.type, val.idx);
            },
          });
        } else {
          window.open(file.url, '_blank');
        }
      };
    });
    container.querySelectorAll('[data-file-download]').forEach(el => {
      el.onclick = () => {
        const val = handleFileAction(el, 'data-file-download');
        if (!val) return;
        const item = data.find(i => i.id == val.id);
        if (!item) return;
        const file = (item[val.type] || [])[val.idx];
        if (file) {
          const a = document.createElement('a');
          a.href = file.url;
          a.download = file.name || file.url.split('/').pop() || 'file';
          a.click();
        }
      };
    });
    container.querySelectorAll('[data-file-delete]').forEach(el => {
      el.onclick = () => {
        const val = handleFileAction(el, 'data-file-delete');
        if (val) deleteFile(val.id, val.type, val.idx);
      };
    });
    container.querySelectorAll('[data-file-upload]').forEach(el => {
      el.onchange = () => {
        const val = handleFileAction(el, 'data-file-upload');
        if (!val || !el.files.length) return;
        for (const file of el.files) uploadFile(val.id, val.type, file);
        el.value = '';
      };
    });
    container.querySelectorAll('[data-panel-upload]').forEach(el => {
      el.onchange = () => {
        const val = handleFileAction(el, 'data-panel-upload');
        if (!val || !el.files.length) return;
        for (const file of el.files) uploadFile(val.id, val.type, file);
        el.value = '';
      };
    });
    container.querySelectorAll('[data-delete-file]').forEach(el => {
      el.onclick = () => {
        const val = handleFileAction(el, 'data-delete-file');
        if (val) deleteFile(val.id, val.type, val.idx);
      };
    });
    const fp = container.querySelector('[data-filter-prop]');
    if (fp) fp.onchange = () => { filterProp = fp.value; currentPage = 1; render(); };
    const fc = container.querySelector('[data-filter-cat]');
    if (fc) fc.onchange = () => { filterCategory = fc.value; currentPage = 1; render(); };
    const prev = container.querySelector('[data-prev]');
    if (prev) prev.onclick = () => { if (currentPage > 1) { currentPage--; render(); } };
    const next = container.querySelector('[data-next]');
    if (next) next.onclick = () => { const p = paginated(); if (p.hasNext) { currentPage++; render(); } };
  }

  loadData();
}
