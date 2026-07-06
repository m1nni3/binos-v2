import { apiClient, formatCurrency, formatDate, formatNumber } from '../lib/utils.js';
import { subscribe } from '../lib/cache.js';
import { openImageViewer } from '../lib/image-viewer.js';
import { toast } from '../lib/toast.js';

const PROPERTY_COLORS = {
  Oakdale: 'blue',
  Malindi: 'green',
  Indaba: 'purple',
  Villeroy: 'orange',
};

const PROPERTY_DETAIL_TABS = [
  'Overview',
  'Financials',
  'Contacts',
  'Maintenance',
  'Documents',
  'Valuation',
  'Insurances',
  'Bonds',
  'History',
  'Notes',
  'Mapping',
  'Access',
  'Tags',
  'Timeline',
];

const PROPERTY_SECTIONS = {
  Overview: ['scheme_name', 'purchase_price', 'purchase_date', 'size', 'beds', 'baths', 'address'],
  Financials: ['value', 'rental_income', 'expenses', 'profit_margin'],
  Contacts: ['primary_contact', 'contact_phone', 'contact_email', 'secondary_contact'],
  Maintenance: ['last_maintenance_date', 'next_maintenance_due', 'maintenance_budget'],
  Documents: ['doc_summary', 'doc_last_updated', 'doc_status'],
  Valuation: ['current_valuation', 'valuation_date', 'valuation_company', 'valuation_agent'],
  Insurances: ['insurance_provider', 'insurance_policy', 'insurance_expires', 'insurance_coverage'],
  Bonds: ['bond_holder', 'bond_amount', 'bond_expiry', 'bond_status'],
  History: ['history_summary', 'first_owned', 'previous_owner', 'acquisition_cost'],
  Notes: ['notes_summary', 'notes_content', 'priority_level'],
  Mapping: ['location_notes', 'gps_coordinates', 'land_size', 'zoning'],
  Access: ['lock_system', 'key_holder', 'access_description'],
  Tags: ['tag_list', 'custom_tags', 'tag_status'],
  Timeline: ['timeline_events'],
};

const TAB_CONTACT_FILTERS = {
  Overview: ['owner'],
  Financials: ['owner'],
  Contacts: ['primary', 'secondary'],
  Maintenance: ['technician'],
  Documents: ['provider'],
  Valuation: ['company'],
  Insurances: ['provider'],
  Bonds: ['holder'],
  History: ['party'],
  Notes: ['author'],
  Mapping: [' surveyor'],
  Access: ['system'],
  Tags: [''],
  Timeline: [''],
};

const PROPERTY_FILTER_OPTIONS = {
  Scheme: ['Oakdale', 'Malindi', 'Indaba', 'Villeroy'],
  Status: ['Active', 'Pending', 'Sold', 'Under Maintenance'],
  Type: ['Residential', 'Commercial', 'Mixed Use'],
};

export function renderProperties(container) {
  let state = {
    properties: [],
    selected: null,
    detail: null,
    slideLoading: false,
    detailView: 'overview',
    tab: 0,
    editing: false,
    editForm: {},
    saving: false,
    searchQuery: '',
    filters: {
      scheme: 'all',
      status: 'all',
      type: 'all',
    },
    sort: 'name',
    page: 1,
    pageSize: 20,
    showAddModal: false,
    addProperty: { scheme_name: '', purchase_price: '', purchase_date: '', scheme: '' },
    error: null,
    loading: true,
    selectedContacts: [],
    showContactModal: false,
    contactForm: { name: '', phone: '', email: '', category: '', notes: '', property_id: null },
  };

  const stateCache = { properties: [], detail: null, selected: null };

  let detailRerenderScheduled = false;

  function safeRerender() {
    if (detailRerenderScheduled) return;
    detailRerenderScheduled = true;
    setTimeout(() => {
      detailRerenderScheduled = false;
      rerenderDetailView();
    }, 16);
  }

  function handleCacheUpdate(newState) {
    if (JSON.stringify(newState.properties) !== JSON.stringify(state.properties)) {
      state.properties = newState.properties || [];
      state.loading = false;
      rerender();
    }
  }

  const unsubscribe = subscribe(handleCacheUpdate);

  function escHtmlLocal(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function loadProperties() {
    try {
      state.loading = true;
      state.error = null;
      const data = await apiClient.get('/properties');
      state.properties = Array.isArray(data) ? data : [];
      state.loading = false;
      rerender();
    } catch (err) {
      state.error = err.message;
      state.loading = false;
      rerender();
    }
  }

  function getFilteredProperties() {
    let filtered = state.properties.filter(p => {
      const matchesSearch = !state.searchQuery ||
        p.scheme_name?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        p.address?.toLowerCase().includes(state.searchQuery.toLowerCase());

      const matchesScheme = state.filters.scheme === 'all' || p.scheme === state.filters.scheme;
      const matchesStatus = state.filters.status === 'all' || p.status === state.filters.status;
      const matchesType = state.filters.type === 'all' || p.type === state.filters.type;

      return matchesSearch && matchesScheme && matchesStatus && matchesType;
    });

    filtered.sort((a, b) => {
      if (state.sort === 'name') return (a.scheme_name || '').localeCompare(b.scheme_name || '');
      if (state.sort === 'value') return (b.value || 0) - (a.value || 0);
      if (state.sort === 'date') return new Date(b.purchase_date || 0) - new Date(a.purchase_date || 0);
      return 0;
    });

    return filtered;
  }

  function getPropertyCards() {
    const filtered = getFilteredProperties();
    const total = filtered.length;
    const start = (state.page - 1) * state.pageSize;
    const paginated = filtered.slice(start, start + state.pageSize);

    let html = `
      <div class="mb-4 px-5 py-3 bg-white border-b border-binos-border flex items-center justify-between">
        <div class="text-sm text-binos-gray">Showing ${Math.min(start + 1, total)}-${Math.min(start + state.pageSize, total)} of ${total} properties</div>
        <div class="flex gap-3">
          <div class="relative">
            <input type="text" placeholder="Search..." value="${state.searchQuery}" class="input-field pl-9 pr-3 py-1.5 text-sm w-48" oninput="(e => { state.searchQuery = e.target.value; state.page = 1; rerender(); })(event)">
            <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-binos-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <select class="select-field py-1.5 text-sm" onchange="(e => { state.filters.scheme = e.target.value; state.page = 1; rerender(); })(event)">
            <option value="all">All Schemes</option>
            ${Object.keys(PROPERTY_FILTER_OPTIONS.Scheme).map(k => `<option value="${k}" ${state.filters.scheme === k ? 'selected' : ''}>${k}</option>`).join('')}
          </select>
          <select class="select-field py-1.5 text-sm" onchange="(e => { state.filters.status = e.target.value; state.page = 1; rerender(); })(event)">
            <option value="all">All Status</option>
            <option value="Active" ${state.filters.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Pending" ${state.filters.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Sold" ${state.filters.status === 'Sold' ? 'selected' : ''}>Sold</option>
            <option value="Under Maintenance" ${state.filters.status === 'Under Maintenance' ? 'selected' : ''}>Under Maintenance</option>
          </select>
          <select class="select-field py-1.5 text-sm" onchange="(e => { state.sort = e.target.value; rerender(); })(event)">
            <option value="name" ${state.sort === 'name' ? 'selected' : ''}>Sort by Name</option>
            <option value="value" ${state.sort === 'value' ? 'selected' : ''}>Sort by Value</option>
            <option value="date" ${state.sort === 'date' ? 'selected' : ''}>Sort by Date</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
    `;

    if (state.loading) {
      html += `
        <div class="col-span-full flex justify-center py-12">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-binos-blue"></div>
        </div>
      `;
    } else if (state.error) {
      html += `
        <div class="col-span-full p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <div class="font-medium mb-1">Error loading properties</div>
          <div class="text-sm">${state.error}</div>
        </div>
      `;
    } else if (paginated.length === 0) {
      html += `
        <div class="col-span-full p-8 bg-gray-50 rounded-lg border border-gray-200 text-center">
          <div class="w-12 h-12 bg-binos-light rounded-full flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-binos-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          </div>
          <div class="text-binos-gray">No properties found</div>
        </div>
      `;
    } else {
      html += paginated.map(p => {
        const colorClass = PROPERTY_COLORS[p.scheme] || 'blue';
        const imageUrl = `/public/property-images/${p.image || 'placeholder.png'}`;
        const fallbackImage = '/public/property-images/placeholder.png';

        return `
          <div class="card cursor-pointer group ${state.selected === p.id ? 'ring-2 ring-binos-blue' : ''}" onclick="() => handleCardClick('${p.id}')">
            <div class="relative h-40 overflow-hidden rounded-t-card">
              <img src="${imageUrl}" alt="${p.scheme_name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='${fallbackImage}'">
              <div class="absolute top-2 right-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-${colorClass}-100 text-${colorClass}-800">
                  ${p.scheme}
                </span>
              </div>
            </div>
            <div class="p-4">
              <h3 class="font-display font-semibold text-lg mb-1 truncate group-hover:text-binos-blue transition-colors">${escHtmlLocal(p.scheme_name)}</h3>
              <div class="text-sm text-binos-gray mb-3 truncate">${escHtmlLocal(p.address)}</div>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div class="text-binos-gray text-xs mb-0.5">Purchase Price</div>
                  <div class="font-medium amount-neutral">${formatCurrency(p.purchase_price)}</div>
                </div>
                <div>
                  <div class="text-binos-gray text-xs mb-0.5">Current Value</div>
                  <div class="font-medium amount-${p.value >= 0 ? 'positive' : 'negative'}">${formatCurrency(p.value)}</div>
                </div>
                <div>
                  <div class="text-binos-gray text-xs mb-0.5">Size</div>
                  <div class="font-medium">${formatNumber(p.size)} m²</div>
                </div>
                <div>
                  <div class="text-binos-gray text-xs mb-0.5">Beds/Baths</div>
                  <div class="font-medium">${p.beds || 0}/${p.baths || 0}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    html += `
      </div>
      <div class="px-5 py-4 border-t border-binos-border flex items-center justify-between">
        <div class="text-sm text-binos-gray">
          Page ${state.page} of ${Math.ceil(total / state.pageSize)}
        </div>
        <div class="flex gap-2">
          <button class="btn-secondary btn-sm" ${state.page === 1 ? 'disabled' : ''} onclick="(e => { if (state.page > 1) { state.page--; rerender(); } })(event)" ${state.page === 1 ? 'disabled' : ''}>
            Previous
          </button>
          <button class="btn-secondary btn-sm" ${state.page >= Math.ceil(total / state.pageSize) ? 'disabled' : ''} onclick="(e => { if (state.page < Math.ceil(total / state.pageSize)) { state.page++; rerender(); } })(event)" ${state.page >= Math.ceil(total / state.pageSize) ? 'disabled' : ''}>
            Next
          </button>
        </div>
      </div>
    `;
    return html;
  }

  function renderPropertyCard(p, colorClass) {
    const imageUrl = `/public/property-images/${p.image || 'placeholder.png'}`;
    const fallbackImage = `/public/property-images/placeholder.png`;

    return `
      <div class="card cursor-pointer group ${state.selected === p.id ? 'ring-2 ring-binos-blue' : ''}" onclick="() => handleCardClick('${p.id}')">
        <div class="relative h-40 overflow-hidden rounded-t-card">
          <img src="${imageUrl}" alt="${p.scheme_name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='${fallbackImage}'">
          <div class="absolute top-2 right-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-${colorClass}-100 text-${colorClass}-800">
              ${p.scheme}
            </span>
          </div>
        </div>
        <div class="p-4">
          <h3 class="font-display font-semibold text-lg mb-1 truncate group-hover:text-binos-blue transition-colors">${escHtmlLocal(p.scheme_name)}</h3>
          <div class="text-sm text-binos-gray mb-3 truncate">${escHtmlLocal(p.address)}</div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div class="text-binos-gray text-xs mb-0.5">Purchase Price</div>
              <div class="font-medium amount-neutral">${formatCurrency(p.purchase_price)}</div>
            </div>
            <div>
              <div class="text-binos-gray text-xs mb-0.5">Current Value</div>
              <div class="font-medium amount-${p.value >= 0 ? 'positive' : 'negative'}">${formatCurrency(p.value)}</div>
            </div>
            <div>
              <div class="text-binos-gray text-xs mb-0.5">Size</div>
              <div class="font-medium">${formatNumber(p.size)} m²</div>
            </div>
            <div>
              <div class="text-binos-gray text-xs mb-0.5">Beds/Baths</div>
              <div class="font-medium">${p.beds || 0}/${p.baths || 0}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function handleCardClick(propId) {
    if (state.selected === propId) return;

    state.selected = propId;
    state.slideLoading = true;
    detailRerenderScheduled = false;
    rerenderPropertyGrid();

    if (!state.detail || state.detail.id !== propId) {
      state.detail = null;
      safeRerender();

      async function loadDetail() {
        try {
          state.slideLoading = false;
          const data = await apiClient.get(`/properties/${propId}`);
          state.detail = { ...state.detail, ...data };
          safeRerender();
        } catch (err) {
          state.detail = { ...state.detail, error: err.message };
          safeRerender();
        }
      }
      loadDetail();
    } else {
      safeRerender();
    }
  }

  function closePanel() {
    state.selected = null;
    state.detail = null;
    state.slideLoading = false;
    detailRerenderScheduled = false;
    rerender();
  }

  function setTab(index) {
    state.tab = Math.max(0, Math.min(index, PROPERTY_DETAIL_TABS.length - 1));
    safeRerender();
  }

  function setTabByName(tabName) {
    const index = PROPERTY_DETAIL_TABS.indexOf(tabName);
    if (index !== -1) setTab(index);
  }

  function toggleEdit() {
    state.editing = !state.editing;
    if (!state.editing) {
      state.editForm = {};
    }
    rerenderDetailView();
  }

  async function saveDetails() {
    state.saving = true;
    try {
      const payload = {
        ...state.editForm,
        property_id: state.selected,
      };
      await apiClient.put('/properties', payload);
      state.editing = false;
      state.editForm = {};
      await loadProperties();
      if (state.detail) {
        const data = await apiClient.get(`/properties/${state.selected}`);
        state.detail = { ...state.detail, ...data };
      }
    } catch (err) {
      toast.error('Failed to save details');
    } finally {
      state.saving = false;
      rerenderDetailView();
    }
  }

  function addContactToProperty() {
    if (!state.selected) return;
    state.showContactModal = true;
    state.contactForm = { ...state.contactForm, property_id: state.selected };
    rerenderDetailView();
  }

  function closeContactModal() {
    state.showContactModal = false;
    state.contactForm = { name: '', phone: '', email: '', category: '', notes: '', property_id: null };
    rerenderDetailView();
  }

  async function saveContact() {
    try {
      await apiClient.post('/contacts', state.contactForm);
      closeContactModal();
      if (state.detail) {
        const data = await apiClient.get(`/properties/${state.selected}/contacts`);
        state.detail = { ...state.detail, contacts: data };
      }
    } catch (err) {
      toast.error('Failed to save contact');
    }
  }

  async function deleteContact(contactId) {
    try {
      await apiClient.del(`/contacts/${contactId}`);
      if (state.detail) {
        const data = await apiClient.get(`/properties/${state.selected}/contacts`);
        state.detail = { ...state.detail, contacts: data };
      }
    } catch (err) {
      toast.error('Failed to delete contact');
    }
  }

  function toggleAddModal() {
    state.showAddModal = !state.showAddModal;
    if (!state.showAddModal) {
      state.addProperty = { scheme_name: '', purchase_price: '', purchase_date: '', scheme: '' };
    } else {
      state.addProperty = { scheme_name: '', purchase_price: '', purchase_date: '', scheme: '' };
    }
    rerender();
  }

  async function saveNewProperty() {
    state.saving = true;
    try {
      await apiClient.post('/properties', state.addProperty);
      toggleAddModal();
      await loadProperties();
    } catch (err) {
      toast.error('Failed to save property');
    } finally {
      state.saving = false;
    }
  }

  function updateAddPropertyField(key, value) {
    state.addProperty = { ...state.addProperty, [key]: value };
    rerender();
  }

  function updateEditFormField(key, value) {
    state.editForm = { ...state.editForm, [key]: value };
    safeRerender();
  }

  function updateContactFormField(key, value) {
    state.contactForm = { ...state.contactForm, [key]: value };
    rerenderDetailView();
  }

  function rerenderPropertyGrid() {
    const gridEl = document.getElementById('properties-grid');
    if (gridEl) {
      gridEl.innerHTML = getPropertyCards();
      attachPropertyGridEventHandlers();
    }
  }

  function attachPropertyGridEventHandlers() {
    document.querySelectorAll('[onclick^="() => handleCardClick"]')
      .forEach(el => {
        const handler = eval(el.getAttribute('onclick'));
        el.onclick = () => handler();
      });

    document.querySelectorAll('[onclick^="(e =>"]').forEach(el => {
      const fullText = el.getAttribute('onclick');
      if (fullText.includes('(e => {')) {
        const handlerCode = fullText.match(/\(e => \{[^}]*\}\)/s)[0];
        const newFn = new Function('e', `return ${handlerCode}`);
        el.onclick = (e) => {
          if (el.disabled) return;
          newFn(e);
        };
      }
    });
  }

  function renderPropertySlidePanel() {
    if (!state.selected) {
      return '';
    }

    let html = `
      <div class="fixed inset-y-0 right-0 w-full lg:w-[600px] bg-white border-l border-binos-border shadow-xl z-30 transform transition-transform duration-300 flex flex-col ${state.selected ? 'translate-x-0' : 'translate-x-full'}">
        <div class="flex items-center justify-between px-5 py-4 border-b border-binos-border bg-white/95 backdrop-blur-sm">
          <div class="flex items-center gap-2">
            <button class="p-1.5 rounded-lg hover:bg-binos-light" onclick="() => closePanel()">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <h3 class="font-display font-semibold text-lg">Property Details</h3>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn-secondary btn-sm ${state.editing ? 'bg-binos-blue/10 text-binos-blue border-binos-blue' : ''}" onclick="() => toggleEdit()">
              ${state.editing ? 'Cancel' : 'Edit'}
            </button>
            <button class="btn-primary btn-sm" onclick="() => saveDetails()" ${state.saving ? 'disabled' : ''}>
              ${state.saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
    `;

    if (state.detail && !state.detail.error) {
      html += renderDetailContent();
    } else if (state.slideLoading) {
      html += `
        <div class="flex-1 flex items-center justify-center">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-binos-blue"></div>
        </div>
      `;
    } else if (state.detail && state.detail.error) {
      html += `
        <div class="flex-1 p-6">
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <div class="font-medium mb-1">Error loading property details</div>
            <div class="text-sm">${state.detail.error}</div>
          </div>
        </div>
      `;
    } else if (!state.detail) {
      html += `
        <div class="flex-1 p-6 text-center text-binos-gray">
          <div class="w-12 h-12 bg-binos-light rounded-full flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-binos-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <div>No property details available</div>
        </div>
      `;
    }

    html += `
      </div>
    `;
    return html;
  }

  function renderDetailContent() {
    if (!state.detail || state.detail.error) {
      return '';
    }

    const colorClass = PROPERTY_COLORS[state.detail.scheme] || 'blue';

    let html = `
      <div class="flex-1 overflow-y-auto">
        <div class="p-5 border-b border-binos-border bg-binos-light/50">
          <div class="flex items-start gap-4">
            <div class="w-16 h-16 rounded-lg bg-gradient-to-br from-${colorClass}-100 to-${colorClass}-200 flex items-center justify-center text-${colorClass}-700 font-bold text-xl">
              ${state.detail.scheme?.charAt(0) || 'P'}
            </div>
            <div class="flex-1">
              <h2 class="font-display font-semibold text-xl mb-1">${escHtmlLocal(state.detail.scheme_name)}</h2>
              <div class="text-sm text-binos-gray mb-3">${escHtmlLocal(state.detail.address)}</div>
              <div class="flex flex-wrap gap-2">
                <span class="badge badge-${colorClass}-neutral">${state.detail.status}</span>
                <span class="badge badge-${colorClass}-blue">${state.detail.type}</span>
                <span class="badge badge-${colorClass}-green">${formatCurrency(state.detail.value)}</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-binos-gray mb-1">Purchase Date</div>
              <div class="text-sm font-medium">${formatDate(state.detail.purchase_date)}</div>
            </div>
          </div>
          ${state.detail.images && state.detail.images.length > 0 ? `
          <div class="mt-3 flex gap-2">
            ${state.detail.images.slice(0, 2).map(img => `
              <img src="${escHtmlLocal(img)}" class="w-1/2 rounded-lg overflow-hidden border border-binos-border hover:opacity-90 transition-opacity cursor-pointer h-28 object-cover" data-img-viewer="${escHtmlLocal(img)}">
            `).join('')}
            ${state.detail.images.length > 2 ? `<span class="w-1/2 rounded-lg overflow-hidden border border-binos-border flex items-center justify-center bg-binos-light text-binos-gray text-sm hover:bg-binos-border transition-colors cursor-pointer" data-img-viewer="${escHtmlLocal(state.detail.images[2])}">+${state.detail.images.length - 2} more</span>` : ''}
          </div>
          ` : ''}
        </div>

        <div class="border-b border-binos-border bg-white sticky top-0 z-20">
          <div class="flex overflow-x-auto px-5">
            ${PROPERTY_DETAIL_TABS.map((tab, index) => {
      const isActive = state.tab === index;
      const activeClass = isActive ? 'tab-item-active' : 'tab-item-inactive';
      return `
                <button class="${activeClass} whitespace-nowrap ${tab === 'History' || tab === 'Timeline' || tab === 'Notes' ? 'px-5' : 'px-4'} py-3 text-sm font-medium ${isActive ? '' : 'hover:text-binos-navy'} transition-colors" onclick="() => setTab(${index})">
                  ${tab}
                </button>
              `;
    }).join('')
    }
          </div>
        </div>

        <div class="p-5">
    `;

    const activeTab = PROPERTY_DETAIL_TABS[state.tab];
    const filteredSection = PROPERTY_SECTIONS[activeTab] || [];

    if (state.editing) {
      html += `
        <div class="bg-binos-light/50 rounded-lg p-4 mb-4">
          <div class="text-sm font-medium text-binos-gray mb-3">Editing ${activeTab}</div>
          <div class="grid grid-cols-2 gap-3">
            ${filteredSection.map(field => {
        const value = state.editForm[field] ?? state.detail[field];
        const isCurrency = field.includes('price') || field.includes('amount') || field.includes('valuation') || field.includes('value') || field.includes('amount') || field.includes('coverage') || field.includes('amount') || field.includes('cost') || field.includes('budget') || field.includes('income') || field.includes('expense') || field.includes('profit') || field.includes('Rental') || field.includes('deducted');
        const isDate = field.includes('date') || field.endsWith('_date');
        const isText = !isCurrency && !isDate;
        const placeholer = field.replace(/_/g, ' ');
        return `
                  <div>
                    <label class="block text-xs text-binos-gray mb-1.5">${placeholer}</label>
                    <input type="text" class="input-field text-xs" value="${value || ''}" ${isCurrency ? 'data-currency=true' : ''} ${isDate ? 'type="date"' : ''} onchange="(e => { updateEditFormField('${field}', e.target.value) })(event)">
                  </div>
                `;
      }).join('')
      }
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${filteredSection.map(field => {
        const value = state.detail[field];
        const display = value === null || value === undefined ? '—' : value;

        let formatted = display;
        if (isCurrencyField(field)) formatted = formatCurrency(value);
        else if (isDateField(field)) formatted = formatDate(value);
        else if (isNumberField(field)) formatted = formatNumber(value);

        return `
              <div class="dl-row">
                <div class="dl-label">${formatFieldLabel(field)}</div>
                <div class="dl-value">${formatted}</div>
              </div>
            `;
      }).join('')
      }
          </div>
      `;
    }

    html += `
        </div>
      `;

    const activeTabContacts = TAB_CONTACT_FILTERS[activeTab] || [];
    if (activeTabContacts.includes('owner') && state.detail.contacts) {
      html += `
        <div class="mb-6">
          <div class="px-5 py-3 bg-binos-light/50 border-y border-binos-border flex items-center justify-between">
            <h4 class="font-medium text-sm">Associated Contacts</h4>
            <button class="btn-primary btn-sm" onclick="() => addContactToProperty()">
              Add Contact
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 p-5">
            ${state.detail.contacts.map(c => {
        const contactType = c.category === 'owner' ? 'owner' : 'secondary';
        if (!activeTabContacts.includes(contactType)) return '';

        return `
              <div class="card p-3">
                <div class="flex items-start justify-between mb-2">
                  <div class="font-medium text-sm">${escHtmlLocal(c.name)}</div>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.category === 'owner' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
                    ${c.category}
                  </span>
                </div>
                <div class="text-xs text-binos-gray space-y-1">
                  ${c.phone ? `<div>${escHtmlLocal(c.phone)}</div>` : ''}
                  ${c.email ? `<div>${escHtmlLocal(c.email)}</div>` : ''}
                  ${c.notes ? `<div class="mt-1">${escHtmlLocal(c.notes)}</div>` : ''}
                </div>
              </div>
            `;
      }).join('')
      }
          </div>
        </div>
      `;
    }

    if (state.showContactModal) {
      html += `
        <div class="modal-overlay" onclick="() => closeContactModal()">
          <div class="modal-content" onclick="event.stopPropagation()">
            <div class="card-header">
              <h3 class="font-display font-semibold">Add Contact</h3>
              <button class="p-1.5 rounded-lg hover:bg-binos-light" onclick="() => closeContactModal()">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="card-body">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-binos-gray mb-1.5">Name</label>
                  <input type="text" class="input-field" value="${state.contactForm.name}" onchange="(e => { updateContactFormField('name', e.target.value) })(event)">
                </div>
                <div>
                  <label class="block text-sm font-medium text-binos-gray mb-1.5">Phone</label>
                  <input type="text" class="input-field" value="${state.contactForm.phone}" onchange="(e => { updateContactFormField('phone', e.target.value) })(event)">
                </div>
                <div>
                  <label class="block text-sm font-medium text-binos-gray mb-1.5">Email</label>
                  <input type="email" class="input-field" value="${state.contactForm.email}" onchange="(e => { updateContactFormField('email', e.target.value) })(event)">
                </div>
                <div>
                  <label class="block text-sm font-medium text-binos-gray mb-1.5">Category</label>
                  <select class="select-field" onchange="(e => { updateContactFormField('category', e.target.value) })(event)">
                    <option value="">Select category</option>
                    <option value="owner" ${state.contactForm.category === 'owner' ? 'selected' : ''}>Owner</option>
                    <option value="secondary" ${state.contactForm.category === 'secondary' ? 'selected' : ''}>Secondary</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-binos-gray mb-1.5">Notes</label>
                  <textarea class="input-field min-h-[80px]" onchange="(e => { updateContactFormField('notes', e.target.value) })(event)">${state.contactForm.notes}</textarea>
                </div>
                <div class="flex gap-3 pt-2">
                  <button class="btn-secondary flex-1" onclick="() => closeContactModal()">Cancel</button>
                  <button class="btn-primary flex-1" onclick="() => saveContact()">Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
    return html;
  }

  function rerenderDetailView() {
    const detailEl = document.getElementById('property-detail-panel');
    if (detailEl) {
      detailEl.innerHTML = renderPropertySlidePanel();
      attachDetailPanelEventHandlers();
    }
  }

  function attachDetailPanelEventHandlers() {
    document.querySelectorAll('[onclick^="() => closePanel"]').forEach(el => {
      el.onclick = () => closePanel();
    });

    document.querySelectorAll('[onclick^="() => setTab"]').forEach(el => {
      const handlerText = el.getAttribute('onclick');
      const match = handlerText.match(/\(\) => setTab\((\d+)\)/);
      if (match) {
        const index = parseInt(match[1]);
        el.onclick = () => setTab(index);
      }
    });

    document.querySelectorAll('[onclick^="() => addContactToProperty"]').forEach(el => {
      el.onclick = () => addContactToProperty();
    });

    document.querySelectorAll('[onclick^="() => closeContactModal"]').forEach(el => {
      el.onclick = () => closeContactModal();
    });

    document.querySelectorAll('[onclick^="() => saveContact"]').forEach(el => {
      el.onclick = () => saveContact();
    });

    document.querySelectorAll('[onclick^="() => deleteContact"]").forEach(el => {
      const contactId = el.dataset.contactId;
      el.onclick = () => deleteContact(contactId);
    });

    document.querySelectorAll('[onclick^="() => toggleEdit"]').forEach(el => {
      el.onclick = () => toggleEdit();
    });

    document.querySelectorAll('[onclick^="() => saveDetails"]').forEach(el => {
      el.onclick = () => saveDetails();
    });

    document.querySelectorAll('[onchange^="(e => { updateEditFormField"]').forEach(el => {
      const handlerText = el.getAttribute('onchange');
      const match = handlerText.match(/updateEditFormField\('([^']+)',\s*e\.target\.value\)/);
      if (match) {
        const field = match[1];
        el.onchange = (e) => updateEditFormField(field, e.target.value);
      }
    });

    document.querySelectorAll('[onchange^="(e => { updateContactFormField"]').forEach(el => {
      const handlerText = el.getAttribute('onchange');
      const match = handlerText.match(/updateContactFormField\('([^']+)',\s*e\.target\.value\)/);
      if (match) {
        const field = match[1];
        el.onchange = (e) => updateContactFormField(field, e.target.value);
      }
    });

    document.querySelectorAll('[data-img-viewer]').forEach(el => {
      el.onclick = () => openImageViewer({ url: el.getAttribute('data-img-viewer') });
    });

    document.querySelectorAll('[onclick^="(e =>"]').forEach(el => {
      const fullText = el.getAttribute('onclick');
      if (fullText.includes('(e => {')) {
        const handlerCode = fullText.match(/\(e => \{[^}]*\}\)/s)[0];
        const newFn = new Function('e', `return ${handlerCode}`);
        el.onclick = (e) => {
          if (el.disabled) return;
          newFn(e);
        };
      }
    });
  }

  function isCurrencyField(field) {
    const currencyFields = [
      'purchase_price', 'value', 'rental_income', 'expenses', 'profit_margin',
      'current_valuation', 'insurance_coverage', 'bond_amount',
      'valuation_date', 'deducted_expenses', 'amount_inclusive', 'amount_exclusive',
    ];
    return currencyFields.includes(field);
  }

  function isDateField(field) {
    const dateFields = [
      'purchase_date', 'last_maintenance_date', 'next_maintenance_due',
      'valuation_date', 'insurance_expires', 'bond_expiry', 'first_owned',
    ];
    return dateFields.includes(field);
  }

  function isNumberField(field) {
    const numberFields = [
      'size', 'beds', 'baths', 'maintenance_budget',
    ];
    return numberFields.includes(field);
  }

  function formatFieldLabel(field) {
    return field.replace(/_/g, ' ').replace(/^./, m => m.toUpperCase());
  }

  function renderAddPropertyModal() {
    if (!state.showAddModal) return '';

    return `
      <div class="modal-overlay" onclick="() => toggleAddModal()">
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="card-header">
            <h3 class="font-display font-semibold">Add New Property</h3>
            <button class="p-1.5 rounded-lg hover:bg-binos-light" onclick="() => toggleAddModal()">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="card-body">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-binos-gray mb-1.5">Scheme Name</label>
                <input type="text" class="input-field" value="${state.addProperty.scheme_name}" onchange="(e => { updateAddPropertyField('scheme_name', e.target.value) })(event)">
              </div>
              <div>
                <label class="block text-sm font-medium text-binos-gray mb-1.5">Purchase Price</label>
                <input type="text" class="input-field" value="${state.addProperty.purchase_price}" onchange="(e => { updateAddPropertyField('purchase_price', e.target.value) })(event)">
              </div>
              <div>
                <label class="block text-sm font-medium text-binos-gray mb-1.5">Purchase Date</label>
                <input type="date" class="input-field" value="${state.addProperty.purchase_date}" onchange="(e => { updateAddPropertyField('purchase_date', e.target.value) })(event)">
              </div>
              <div>
                <label class="block text-sm font-medium text-binos-gray mb-1.5">Scheme</label>
                <select class="select-field" onchange="(e => { updateAddPropertyField('scheme', e.target.value) })(event)">
                  <option value="">Select scheme</option>
                  <option value="Oakdale" ${state.addProperty.scheme === 'Oakdale' ? 'selected' : ''}>Oakdale</option>
                  <option value="Malindi" ${state.addProperty.scheme === 'Malindi' ? 'selected' : ''}>Malindi</option>
                  <option value="Indaba" ${state.addProperty.scheme === 'Indaba' ? 'selected' : ''}>Indaba</option>
                  <option value="Villeroy" ${state.addProperty.scheme === 'Villeroy' ? 'selected' : ''}>Villeroy</option>
                </select>
              </div>
              <div class="flex gap-3 pt-2">
                <button class="btn-secondary flex-1" onclick="() => toggleAddModal()">Cancel</button>
                <button class="btn-primary flex-1" onclick="() => saveNewProperty()" ${state.saving ? 'disabled' : ''}>
                  ${state.saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function rerender() {
    const gridEl = document.getElementById('properties-grid');
    if (gridEl) gridEl.innerHTML = getPropertyCards();
    rerenderDetailView();
    const modalEl = document.getElementById('add-property-modal');
    if (modalEl) modalEl.innerHTML = renderAddPropertyModal();
    attachAllEventHandlers();
  }

  function attachAllEventHandlers() {
    attachPropertyGridEventHandlers();
    attachDetailPanelEventHandlers();

    document.querySelectorAll('[onclick^="() => toggleAddModal"]').forEach(el => {
      el.onclick = () => toggleAddModal();
    });

    document.querySelectorAll('[onclick^="() => saveNewProperty"]').forEach(el => {
      el.onclick = () => saveNewProperty();
    });

    document.querySelectorAll('[onclick^="(e =>"]').forEach(el => {
      const fullText = el.getAttribute('onclick');
      if (fullText.includes('(e => {')) {
        const handlerCode = fullText.match(/\(e => \{[^}]*\}\)/s)[0];
        const newFn = new Function('e', `return ${handlerCode}`);
        el.onclick = (e) => {
          if (el.disabled) return;
          newFn(e);
        };
      }
    });
  }

  function renderRoute(container) {
    container.innerHTML = `
      <div class="flex h-full">
        <div id="properties-grid" class="flex-1 overflow-auto relative">
        </div>
        <div id="property-detail-panel" class="relative">
        </div>
        <div id="add-property-modal">
        </div>
      </div>
    `;

    attachAllEventHandlers();
  }

  loadProperties();
  renderRoute(container);
}
