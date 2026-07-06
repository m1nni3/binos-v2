import { apiClient, escHtml } from '../lib/utils.js';
import { ICONS } from '../lib/icons.js';
import { toast } from '../lib/toast.js';

const PROPERTY_COLORS = {
  Oakdale: 'blue',
  Malindi: 'green',
  Indaba: 'purple',
  Villeroy: 'orange',
};

export function renderContacts(container) {
  let state = {
    contacts: [],
    filterProp: 'all',
    filterRole: 'all',
    filterCompany: 'all',
    showForm: false,
    editingId: null,
    form: {
      name: '', role: '', company: '', office: '', phone: '', office_number: '',
      email: '', address: '', website: '', category: '', notes: '', property_id: null,
      applyOffice: false,
    },
    page: 1,
    pageSize: 12,
    loading: true,
    error: null,
    properties: [],
  };

  let urlPropertyId = null;

  async function loadData() {
    try {
      state.loading = true;
      state.error = null;
      const [contactsData, propertiesData] = await Promise.all([
        apiClient.get('/contacts'),
        apiClient.get('/properties'),
      ]);
      state.contacts = Array.isArray(contactsData) ? contactsData : [];
      state.properties = propertiesData || [];
      state.loading = false;
      rerender();
    } catch (err) {
      state.error = err.message;
      state.loading = false;
      rerender();
    }
  }

  function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function uniqueValues(field) {
    return [...new Set(state.contacts.map(c => c[field]).filter(Boolean))].sort();
  }

  function getFilteredContacts() {
    return state.contacts.filter(contact => {
      const matchesProp = state.filterProp === 'all' || contact.property_id == state.filterProp;
      const matchesRole = state.filterRole === 'all' || contact.role === state.filterRole;
      const matchesCompany = state.filterCompany === 'all' || contact.company === state.filterCompany;
      return matchesProp && matchesRole && matchesCompany;
    });
  }

  function getPaginatedContacts() {
    const filtered = getFilteredContacts();
    const total = filtered.length;
    const start = (state.page - 1) * state.pageSize;
    return {
      contacts: filtered.slice(start, start + state.pageSize),
      total,
      hasPrev: state.page > 1,
      hasNext: state.page * state.pageSize < total,
    };
  }

  function contactCard(contact) {
    const property = state.properties.find(p => p.id == contact.property_id);
    const colorClass = property ? (PROPERTY_COLORS[property.scheme] || 'blue') : 'blue';
    return `
      <div class="card p-4 hover:shadow-card-hover transition-shadow border-l-4 border-${colorClass}-500">
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-full bg-${colorClass}-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-${colorClass}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            </div>
            <div class="min-w-0">
              <h3 class="font-display font-medium leading-tight truncate">${escHtml(contact.name)}</h3>
              ${contact.role ? `<div class="text-xs text-binos-gray truncate">${escHtml(contact.role)}</div>` : ''}
            </div>
          </div>
          ${contact.category ? `<span class="badge badge-blue flex-shrink-0">${escHtml(contact.category)}</span>` : ''}
        </div>
        <div class="space-y-1.5 text-sm">
          ${contact.company ? `
            <div class="flex items-center gap-2 text-binos-gray">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              <span>${escHtml(contact.company)}${contact.office ? ' <span class="text-binos-gray/60">/</span> ' + escHtml(contact.office) : ''}</span>
            </div>
          ` : ''}
          ${property ? `
            <div class="flex items-center gap-2 text-binos-gray">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              <span>${escHtml(property.scheme_name)}</span>
            </div>
          ` : ''}
          ${contact.phone ? `
            <div class="flex items-center gap-2 text-binos-gray">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              <a href="tel:${escHtml(contact.phone)}" class="hover:text-binos-blue transition-colors">${escHtml(contact.phone)}</a>
            </div>
          ` : ''}
          ${contact.email ? `
            <div class="flex items-center gap-2 text-binos-gray">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              <a href="mailto:${escHtml(contact.email)}" class="hover:text-binos-blue transition-colors truncate">${escHtml(contact.email)}</a>
            </div>
          ` : ''}
          ${contact.address ? `
            <div class="flex items-start gap-2 text-binos-gray">
              <svg class="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span class="text-xs">${escHtml(contact.address)}</span>
            </div>
          ` : ''}
          ${contact.website ? `
            <div class="flex items-center gap-2 text-binos-gray">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
              <a href="${escHtml(contact.website)}" target="_blank" rel="noopener noreferrer" class="hover:text-binos-blue transition-colors truncate">${escHtml(contact.website)}</a>
            </div>
          ` : ''}
        </div>
        <div class="mt-3 flex gap-2">
          <button class="btn-secondary btn-sm py-1.5 px-3" onclick="() => editContact(${contact.id}, ${JSON.stringify(contact).replace(/'/g, "&apos;")})">
            Edit
          </button>
          <button class="btn-danger btn-sm py-1.5 px-3" onclick="() => confirmDelete(${contact.id}, '${contact.name}')">
            Delete
          </button>
        </div>
      </div>
    `;
  }

  function showForm() {
    state.showForm = true;
    state.editingId = null;
    state.form = {
      name: '', role: '', company: '', office: '', phone: '', office_number: '',
      email: '', address: '', website: '', category: '', notes: '', property_id: null,
      applyOffice: false,
    };
    if (urlPropertyId) state.form.property_id = urlPropertyId;
    rerender();
  }

  function editContact(id, contactData) {
    state.showForm = true;
    state.editingId = id;
    state.form = { ...contactData, applyOffice: false };
    rerender();
  }

  function deleteContact(id) {
    state.showDeleteConfirm = id;
    rerender();
  }

  function confirmDelete(id) {
    state.showDeleteConfirm = null;
    if (!id) return;
    apiClient.del(`/contacts/${id}`).then(() => {
      state.contacts = state.contacts.filter(c => c.id !== id);
      rerender();
    }).catch(err => {
      toast.error('Failed to delete contact');
    });
  }

  function closeForm() {
    state.showForm = false;
    state.editingId = null;
    state.form = {
      name: '', role: '', company: '', office: '', phone: '', office_number: '',
      email: '', address: '', website: '', category: '', notes: '', property_id: null,
      applyOffice: false,
    };
    rerender();
  }

  async function saveContact() {
    if (!state.form.name) return;
    try {
      const body = { ...state.form };
      delete body.applyOffice;

      if (state.editingId) {
        await apiClient.put(`/contacts/${state.editingId}`, body);
      } else {
        await apiClient.post('/contacts', body);
      }

      if (state.form.applyOffice && state.form.office) {
        const officeKey = state.form.office.trim();
        const batchUpdates = state.contacts
          .filter(c => c.office === officeKey && c.id !== state.editingId)
          .map(c => apiClient.put(`/contacts/${c.id}`, {
            ...c,
            address: state.form.address || c.address,
            website: state.form.website || c.website,
            office_number: state.form.office_number || c.office_number,
          }));
        await Promise.allSettled(batchUpdates);
      }

      closeForm();
      await loadData();
    } catch (err) {
      toast.error('Failed to save contact');
    }
  }

  function exportCSV() {
    const headers = ['Name', 'Role', 'Company', 'Office', 'Phone', 'Office Number', 'Email', 'Address', 'Website', 'Category', 'Property', 'Notes'];
    const rows = state.contacts.map(c => {
      const property = state.properties.find(p => p.id == c.property_id);
      return [
        c.name, c.role || '', c.company || '', c.office || '', c.phone || '',
        c.office_number || '', c.email || '', c.address || '', c.website || '',
        c.category || '', property?.scheme_name || '', c.notes || '',
      ];
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function rerender() {
    const paginated = getPaginatedContacts();
    const total = paginated.total;
    const roles = uniqueValues('role');
    const companies = uniqueValues('company');

    let html = `
      <div class="flex flex-col h-full">
        ${state.loading ? `
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-binos-blue"></div>
          </div>
        ` : ''}

        ${state.error ? `
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mx-5 mt-5">
            <div class="font-medium mb-1">Error loading contacts</div>
            <div class="text-sm">${state.error}</div>
          </div>
        ` : ''}

        ${!state.loading && !state.error ? `
          <div class="px-5 py-4 border-b border-binos-border bg-white">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="flex flex-wrap items-center gap-3">
                <div class="relative">
                  <select class="select-field py-2 pr-8 text-sm" onchange="(e => { state.filterProp = e.target.value; state.page = 1; rerender(); })(event)">
                    <option value="all">All Properties</option>
                    ${state.properties.map(p => `<option value="${p.id}" ${state.filterProp == p.id ? 'selected' : ''}>${escHtml(p.scheme_name)}</option>`).join('')}
                  </select>
                </div>
                <div class="relative">
                  <select class="select-field py-2 pr-8 text-sm" onchange="(e => { state.filterRole = e.target.value; state.page = 1; rerender(); })(event)">
                    <option value="all">All Roles</option>
                    ${roles.map(r => `<option value="${escHtml(r)}" ${state.filterRole === r ? 'selected' : ''}>${escHtml(r)}</option>`).join('')}
                  </select>
                </div>
                <div class="relative">
                  <select class="select-field py-2 pr-8 text-sm" onchange="(e => { state.filterCompany = e.target.value; state.page = 1; rerender(); })(event)">
                    <option value="all">All Companies</option>
                    ${companies.map(c => `<option value="${escHtml(c)}" ${state.filterCompany === c ? 'selected' : ''}>${escHtml(c)}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <button class="btn-primary btn-sm" onclick="() => showForm()">
                  <span class="mr-1">${ICONS.plus}</span> Add Contact
                </button>
                <button class="btn-secondary btn-sm" onclick="() => exportCSV()">
                  <span class="mr-1">${ICONS.download}</span> Export CSV
                </button>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-auto">
            <div class="p-5">
              ${paginated.contacts.length === 0 ? `
                <div class="p-8 bg-gray-50 rounded-lg border border-gray-200 text-center">
                  <div class="w-12 h-12 bg-binos-light rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg class="w-6 h-6 text-binos-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                  </div>
                  <div class="text-binos-gray">No contacts found</div>
                </div>
              ` : `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  ${paginated.contacts.map(c => contactCard(c)).join('')}
                </div>
              `}
            </div>
          </div>

          ${paginated.total > 0 ? `
            <div class="px-5 py-4 border-t border-binos-border bg-white">
              <div class="flex items-center justify-between">
                <div class="text-sm text-binos-gray">
                  Showing ${(state.page - 1) * state.pageSize + 1}-${Math.min(state.page * state.pageSize, paginated.total)} of ${paginated.total}
                </div>
                <div class="flex gap-2">
                  <button class="btn-secondary btn-sm" ${!paginated.hasPrev ? 'disabled' : ''} onclick="(e => { if (state.page > 1) { state.page--; rerender(); } })(event)">
                    Previous
                  </button>
                  <button class="btn-secondary btn-sm" ${!paginated.hasNext ? 'disabled' : ''} onclick="(e => { if (state.page * state.pageSize < paginated.total) { state.page++; rerender(); } })(event)">
                    Next
                  </button>
                </div>
              </div>
            </div>
          ` : ''}
        ` : ''}

        ${state.showForm ? `
          <div class="modal-overlay" onclick="() => closeForm()">
            <div class="modal-content max-w-2xl" onclick="event.stopPropagation()">
              <div class="card-header">
                <h3 class="font-display font-semibold">${state.editingId ? 'Edit Contact' : 'Add New Contact'}</h3>
                <button class="p-1.5 rounded-lg hover:bg-binos-light" onclick="() => closeForm()">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div class="card-body">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-binos-gray mb-1.5">Name *</label>
                    <input type="text" class="input-field" value="${escHtml(state.form.name)}" onchange="(e => { state.form.name = e.target.value; rerender(); })(event)" required>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-binos-gray mb-1.5">Role / Job Title</label>
                    <input type="text" class="input-field" value="${escHtml(state.form.role || '')}" onchange="(e => { state.form.role = e.target.value; rerender(); })(event)">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-binos-gray mb-1.5">Category</label>
                    <select class="select-field" onchange="(e => { state.form.category = e.target.value; rerender(); })(event)">
                      <option value="">Select category</option>
                      <option value="owner" ${state.form.category === 'owner' ? 'selected' : ''}>Owner</option>
                      <option value="secondary" ${state.form.category === 'secondary' ? 'selected' : ''}>Secondary</option>
                      <option value="technician" ${state.form.category === 'technician' ? 'selected' : ''}>Technician</option>
                      <option value="provider" ${state.form.category === 'provider' ? 'selected' : ''}>Provider</option>
                      <option value="company" ${state.form.category === 'company' ? 'selected' : ''}>Company</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-binos-gray mb-1.5">Company</label>
                    <input type="text" class="input-field" value="${escHtml(state.form.company || '')}" onchange="(e => { state.form.company = e.target.value; rerender(); })(event)">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-binos-gray mb-1.5">Office</label>
                    <input type="text" class="input-field" placeholder="e.g. Durban, Cape Town" value="${escHtml(state.form.office || '')}" onchange="(e => { state.form.office = e.target.value; rerender(); })(event)">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-binos-gray mb-1.5">Telephone</label>
                    <input type="tel" class="input-field" value="${escHtml(state.form.phone || '')}" onchange="(e => { state.form.phone = e.target.value; rerender(); })(event)">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-binos-gray mb-1.5">Office Number</label>
                    <input type="tel" class="input-field" value="${escHtml(state.form.office_number || '')}" onchange="(e => { state.form.office_number = e.target.value; rerender(); })(event)">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-binos-gray mb-1.5">Email</label>
                    <input type="email" class="input-field" value="${escHtml(state.form.email || '')}" onchange="(e => { state.form.email = e.target.value; rerender(); })(event)">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-binos-gray mb-1.5">Property</label>
                    <select class="select-field" onchange="(e => { state.form.property_id = e.target.value || null; rerender(); })(event)">
                      <option value="">Select property</option>
                      ${state.properties.map(p => `<option value="${p.id}" ${state.form.property_id == p.id ? 'selected' : ''}>${escHtml(p.scheme_name)}</option>`).join('')}
                    </select>
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-binos-gray mb-1.5">Address</label>
                    <input type="text" class="input-field" value="${escHtml(state.form.address || '')}" onchange="(e => { state.form.address = e.target.value; rerender(); })(event)">
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-binos-gray mb-1.5">Website</label>
                    <input type="url" class="input-field" value="${escHtml(state.form.website || '')}" onchange="(e => { state.form.website = e.target.value; rerender(); })(event)">
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-binos-gray mb-1.5">Notes</label>
                    <textarea class="input-field min-h-[80px]" onchange="(e => { state.form.notes = e.target.value; rerender(); })(event)">${escHtml(state.form.notes || '')}</textarea>
                  </div>
                  ${state.form.office ? `
                    <div class="md:col-span-2 pt-2 border-t border-binos-border/50">
                      <label class="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" class="mt-0.5 rounded border-binos-border text-binos-blue focus:ring-binos-blue/30" ${state.form.applyOffice ? 'checked' : ''} onchange="(e => { state.form.applyOffice = e.target.checked; rerender(); })(event)">
                        <div>
                          <div class="text-sm font-medium text-binos-navy">Apply to all contacts from this office</div>
                          <div class="text-xs text-binos-gray">Update address, website, and office number for all contacts with the same office (${escHtml(state.form.office)})</div>
                        </div>
                      </label>
                    </div>
                  ` : ''}
                </div>
                ${urlPropertyId ? `
                  <div class="mt-4 pt-4 border-t border-binos-border">
                    <div class="text-sm text-binos-gray">
                      Property: <span class="font-medium">${state.properties.find(p => p.id == urlPropertyId)?.scheme_name}</span>
                    </div>
                  </div>
                ` : ''}
                <div class="flex gap-3 pt-6">
                  <button class="btn-secondary flex-1" onclick="() => closeForm()">Cancel</button>
                  <button class="btn-primary flex-1" onclick="() => saveContact()" ${!state.form.name ? 'disabled' : ''}>Save Contact</button>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        ${state.showDeleteConfirm ? `
          <div class="modal-overlay" onclick="() => { state.showDeleteConfirm = null; rerender(); }">
            <div class="modal-content max-w-md" onclick="event.stopPropagation()">
              <div class="p-6">
                <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </div>
                <h3 class="font-display font-semibold text-center mb-2">Delete Contact</h3>
                <p class="text-binos-gray text-sm text-center mb-6">
                  Are you sure you want to delete <span class="font-medium text-binos-navy">${state.contacts.find(c => c.id === state.showDeleteConfirm)?.name}</span>?
                  This action cannot be undone.
                </p>
                <div class="flex gap-3">
                  <button class="btn-secondary flex-1" onclick="() => { state.showDeleteConfirm = null; rerender(); }">Cancel</button>
                  <button class="btn-danger flex-1" onclick="() => confirmDelete(state.showDeleteConfirm)">Delete</button>
                </div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    container.innerHTML = html;
    attachEventHandlers();
  }

  function attachEventHandlers() {
    document.querySelectorAll('[onclick^="() => showForm"]').forEach(el => {
      el.onclick = () => showForm();
    });
    document.querySelectorAll('[onclick^="() => closeForm"]').forEach(el => {
      el.onclick = () => closeForm();
    });
    document.querySelectorAll('[onclick^="() => saveContact"]').forEach(el => {
      el.onclick = () => saveContact();
    });
    document.querySelectorAll('[onclick^="() => deleteContact"]').forEach(el => {
      const handlerText = el.getAttribute('onclick');
      const match = handlerText.match(/deleteContact\((\d+),\s*'([^']*)'/);
      if (match) el.onclick = () => deleteContact(parseInt(match[1]), match[2]);
    });
    document.querySelectorAll('[onclick^="() => editContact"]').forEach(el => {
      const handlerText = el.getAttribute('onclick');
      const match = handlerText.match(/editContact\((\d+),\s*([^)]+)\)/);
      if (match) {
        try {
          const contactData = JSON.parse(match[2].replace(/&apos;/g, "'"));
          el.onclick = () => editContact(parseInt(match[1]), contactData);
        } catch (e) { toast.error('Failed to parse contact data'); }
      }
    });
    document.querySelectorAll('[onclick^="() => confirmDelete"]').forEach(el => {
      const handlerText = el.getAttribute('onclick');
      const match = handlerText.match(/confirmDelete\((\d+)\)/);
      if (match) el.onclick = () => confirmDelete(parseInt(match[1]));
    });
    document.querySelectorAll('[onclick^="(e => { state.filterProp"]').forEach(el => {
      const handlerText = el.getAttribute('onclick');
      const match = handlerText.match(/\(e => \{[^}]*\}\)/s);
      if (match) {
        const fnStr = match[0];
        el.onclick = (e) => new Function('e', `return ${fnStr}`)(e);
      }
    });
    document.querySelectorAll('[onclick^="(e => { state.filterRole"]').forEach(el => {
      const handlerText = el.getAttribute('onclick');
      const match = handlerText.match(/\(e => \{[^}]*\}\)/s);
      if (match) {
        const fnStr = match[0];
        el.onclick = (e) => new Function('e', `return ${fnStr}`)(e);
      }
    });
    document.querySelectorAll('[onclick^="(e => { state.filterCompany"]').forEach(el => {
      const handlerText = el.getAttribute('onclick');
      const match = handlerText.match(/\(e => \{[^}]*\}\)/s);
      if (match) {
        const fnStr = match[0];
        el.onclick = (e) => new Function('e', `return ${fnStr}`)(e);
      }
    });
    document.querySelectorAll('[onclick^="(e => { state.page"]').forEach(el => {
      const handlerText = el.getAttribute('onclick');
      const match = handlerText.match(/\(e => \{[^}]*\}\)/s);
      if (match) {
        const fnStr = match[0];
        el.onclick = (e) => new Function('e', `return ${fnStr}`)(e);
      }
    });
    document.querySelectorAll('[disabled][onclick^="(e =>"]').forEach(el => {
      const handlerText = el.getAttribute('onclick');
      if (handlerText.includes('(e => {')) {
        const handlerCode = handlerText.match(/\(e => \{[^}]*\}\)/s)[0];
        const newFn = new Function('e', `return ${handlerCode}`);
        el.onclick = (e) => { if (!el.disabled) newFn(e); };
      }
    });
  }

  loadData();
}
