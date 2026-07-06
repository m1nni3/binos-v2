import { apiClient, formatCurrency, formatNumber, formatDate, escHtml } from '../lib/utils.js';
import { ICONS } from '../lib/icons.js';
import { toast } from '../lib/toast.js';

export function renderFinances(container) {
  let state = {
    chartIncome: null,
    chartBudget: null,
    year: new Date().getFullYear(),
    filterProp: 'all',
    budgets: [],
    monthly: [],
    entries: [],
    properties: [],
    showAddEntryModal: false,
    editCell: null,
    editingValue: '',
    loading: true,
    error: null,
  };

  let incomeChart, budgetChart;

  async function loadData() {
    try {
      state.loading = true;
      state.error = null;

      const [plData, plMonthly, plEntries, properties] = await Promise.all([
        apiClient.get('/pl'),
        apiClient.get('/pl-monthly'),
        apiClient.get('/pl-entries'),
        apiClient.get('/properties'),
      ]);

      state.budgets = plData || [];
      state.monthly = plMonthly || [];
      state.entries = plEntries || [];
      state.properties = properties || [];
      state.loading = false;
      rerender();
    } catch (err) {
      state.error = err.message;
      state.loading = false;
      rerender();
    }
  }

  function getPropertyOptions() {
    const props = [{ id: 'all', name: 'All Properties' }, ...(state.properties || []).map(p => ({ id: p.id, name: p.scheme_name }))];
    return props;
  }

  function getUniqueYears() {
    const years = new Set();
    (state.monthly || []).forEach(m => {
      if (m.year) years.add(m.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }

  function getFilteredData() {
    let filteredBudgets = state.budgets;
    let filteredMonthly = state.monthly;
    let filteredEntries = state.entries;

    if (state.filterProp !== 'all') {
      filteredBudgets = filteredBudgets.filter(b => b.property_id === state.filterProp);
      filteredMonthly = filteredMonthly.filter(m => m.property_id === state.filterProp);
      filteredEntries = filteredEntries.filter(e => e.property_id === state.filterProp);
    }

    if (state.year) {
      filteredMonthly = filteredMonthly.filter(m => m.year === state.year);
      filteredEntries = filteredEntries.filter(e => {
        const y = new Date(e.date).getFullYear();
        return y === state.year;
      });
    }

    return { budgets: filteredBudgets, monthly: filteredMonthly, entries: filteredEntries };
  }

  function renderCharts(filtered) {
    const incomeCtx = document.getElementById('income-chart');
    const budgetCtx = document.getElementById('budget-chart');

    if (incomeCtx && state.chartIncome) state.chartIncome.destroy();
    if (budgetCtx && state.chartBudget) state.chartBudget.destroy();

    if (incomeCtx) {
      const data = {
        labels: (filtered.monthly || []).map(m => m.month),
        datasets: [
          {
            label: 'Income',
            data: (filtered.monthly || []).map(m => m.income),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.1,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Expenses',
            data: (filtered.monthly || []).map(m => m.expenses),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.1,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      };

      state.chartIncome = new Chart(incomeCtx, {
        type: 'line',
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, padding: 20 } },
            title: { display: false },
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: { callback: v => `R${v}` },
            },
          },
        },
      });
    }

    if (budgetCtx) {
      const categories = (filtered.budgets || []).reduce((acc, b) => {
        if (!acc.includes(b.category)) acc.push(b.category);
        return acc;
      }, []);

      const budgetData = categories.map(cat => {
        const b = (filtered.budgets || []).find(b => b.category === cat);
        return b ? b.amount : 0;
      });

      const actualsData = categories.map(cat => {
        const total = (filtered.monthly || [])
          .filter(m => m.category === cat)
          .reduce((sum, m) => sum + (m.amount || 0), 0);
        return total;
      });

      const datasets = [
        {
          label: 'Budget',
          data: budgetData,
          backgroundColor: categories.map(cat => getCategoryColor(cat)),
          borderColor: categories.map(cat => getCategoryColor(cat)),
          borderWidth: 1,
        },
        {
          label: 'Actuals',
          data: actualsData,
          backgroundColor: 'rgba(107, 114, 128, 0.5)',
          borderColor: '#6b7280',
          borderWidth: 1,
        },
      ];

      state.chartBudget = new Chart(budgetCtx, {
        type: 'bar',
        data: { labels: categories, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, padding: 20 } },
            title: { display: false },
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: { callback: v => `R${v}` },
            },
          },
        },
      });
    }
  }

  function getCategoryColor(category) {
    const colors = {
      'Rental Income': '#22c55e',
      'Property Tax': '#3b82f6',
      'Insurance': '#8b5cf6',
      'Maintenance': '#f97316',
      'Management Fee': '#ec4899',
      'Renovation': '#14b8a6',
      'Security': '#eab308',
      'Utilities': '#ef4444',
      'Other Income': '#06b6d4',
    };
    return colors[category] || '#64748b';
  }

  function renderBudgetTable(filtered) {
    let html = `
      <div class="overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-binos-light/50 border-b border-binos-border">
              <th class="text-left px-4 py-3 font-medium text-binos-gray">Category</th>
              <th class="text-left px-4 py-3 font-medium text-binos-gray">Budget Amount</th>
              <th class="text-left px-4 py-3 font-medium text-binos-gray">Last Updated</th>
            </tr>
          </thead>
          <tbody>
    `;

    html += (filtered.budgets || []).map(budget => {
      const amountClass = budget.amount >= 0 ? 'amount-positive' : 'amount-negative';
      const isEditing = state.editCell && state.editCell.id === budget.id && state.editCell.field === 'amount';
      const inputValue = state.editingValue !== undefined ? state.editingValue : budget.amount;

      return `
        <tr class="border-b border-binos-border hover:bg-binos-light/30 transition-colors">
          <td class="px-4 py-3 font-medium ${budget.category === 'Rental Income' ? 'text-green-700' : budget.category === 'Property Tax' ? 'text-blue-700' : ''}">
            ${budget.category}
          </td>
          <td class="px-4 py-3">
            ${isEditing ? `
              <div class="flex items-center gap-2">
                <span class="text-binos-gray">R</span>
                <input type="text" class="input-field px-2 py-1 text-sm w-24" value="${inputValue}" oninput="(e => { state.editingValue = e.target.value })"
                  onblur="(e => { if (/^-?\\d*\\\\.?\\d*$/.test(state.editingValue || '')) { state.editCell = null; saveCellChange('${budget.id}', 'amount', parseFloat(state.editingValue)); } else { state.editingValue = '${budget.amount}'; state.editCell = null; } })(event)"
                  onkeypress="(e => { if (e.key === 'Enter') { e.target.blur(); } })(event)"
                  autofocus>
              </div>
            ` : `
              <span class="${amountClass}">${formatNumber(budget.amount)}</span>
            `}
          </td>
          <td class="px-4 py-3 text-binos-gray text-sm">
            ${formatDate(budget.last_updated || new Date().toISOString())}
          </td>
        </tr>
      `;
    }).join('');

    html += `
          </tbody>
        </table>
      </div>
    `;
    return html;
  }

  function renderActualsTable(filtered) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const categories = Array.from(new Set((filtered.monthly || []).map(m => m.category)));

    let html = `
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-binos-light/50 border-b border-binos-border">
              <th class="px-4 py-3 text-left font-medium text-binos-gray sticky left-0 bg-white">Category</th>
              ${months.map(m => `<th class="px-2 py-3 text-center font-medium text-binos-gray text-xs" title="${m}">${m}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;

    html += categories.map(cat => {
      const catData = (filtered.monthly || []).filter(m => m.category === cat);

      return `
        <tr class="border-b border-binos-border hover:bg-binos-light/30 transition-colors">
          <td class="px-4 py-2 font-medium sticky left-0 bg-white ${cat === 'Rental Income' ? 'text-green-700' : cat === 'Property Tax' ? 'text-blue-700' : ''}">
            ${cat}
          </td>
          ${months.map(month => {
  const data = catData.find(m => m.month === month) || { amount: 0 };
  const isEditing = state.editCell && state.editCell.id === data.id && state.editCell.field === `amount_${month}`;
  const monthIndex = months.indexOf(month);
  const inputValue = state.editingValue !== undefined ? state.editingValue : (data.amount || 0);

  return `
            <td class="px-2 py-2 text-center">
              ${isEditing ? `
                <div class="relative">
                  <span class="absolute left-1 top-1/2 -translate-y-1/2 text-binos-gray text-xs">R</span>
                  <input type="text" class="input-field px-1 py-1 text-sm w-20 text-right" value="${inputValue}" oninput="(e => { state.editingValue = e.target.value })"
                    onblur="(e => { if (/^-?\\d*\\\\.?\\d*$/.test(state.editingValue || '')) { state.editCell = null; saveCellChange('${data.id || 'new'}', 'amount_${month}', parseFloat(state.editingValue)); } else { state.editingValue = '${data.amount || 0}'; state.editCell = null; } })(event)"
                    onkeypress="(e => { if (e.key === 'Enter') { e.target.blur(); } })(event)"
                    autofocus>
                </div>
              ` : `
                <span class="${data.amount > 0 ? 'amount-positive' : data.amount < 0 ? 'amount-negative' : 'amount-neutral'}">
                  ${formatNumber(data.amount || 0)}
                </span>
              `}
            </td>
          `;
})}.join('')
      };

      return html;
    }).join('');

    html += `
          </tbody>
        </table>
      </div>
    `;
    return html;
  }

  function renderEntriesTable(filtered) {
    let html = `
      <div class="overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-binos-light/50 border-b border-binos-border">
              <th class="text-left px-4 py-3 font-medium text-binos-gray">Date</th>
              <th class="text-left px-4 py-3 font-medium text-binos-gray">Category</th>
              <th class="text-left px-4 py-3 font-medium text-binos-gray">Description</th>
              <th class="text-right px-4 py-3 font-medium text-binos-gray">Amount</th>
              <th class="text-left px-4 py-3 font-medium text-binos-gray">Property</th>
            </tr>
          </thead>
          <tbody>
    `;

    html += (filtered.entries || []).map(entry => {
      const amountClass = entry.amount > 0 ? 'amount-positive' : 'amount-negative';
      const amountPrefix = entry.amount > 0 ? '+' : '';
      const isEditing = state.editCell && state.editCell.id === entry.id && state.editCell.field === 'amount';

      return `
        <tr class="border-b border-binos-border hover:bg-binos-light/30 transition-colors">
          <td class="px-4 py-3 text-binos-gray">${formatDate(entry.date)}</td>
          <td class="px-4 py-3 font-medium">${entry.category}</td>
          <td class="px-4 py-3">${escHtml(entry.description)}</td>
          <td class="px-4 py-3 text-right">
            ${isEditing ? `
              <div class="flex items-center justify-end gap-2">
                <span class="text-binos-gray">R</span>
                <input type="text" class="input-field px-2 py-1 text-sm w-24 text-right" value="${state.editingValue !== undefined ? state.editingValue : entry.amount}" oninput="(e => { state.editingValue = e.target.value })"
                  onblur="(e => { if (/^-?\\d*\\\\.?\\d*$/.test(state.editingValue || '')) { state.editCell = null; saveCellChange('${entry.id}', 'amount', parseFloat(state.editingValue)); } else { state.editingValue = '${entry.amount}'; state.editCell = null; } })(event)"
                  onkeypress="(e => { if (e.key === 'Enter') { e.target.blur(); } })(event)"
                  autofocus>
              </div>
            ` : `
              <span class="${amountClass}">${amountPrefix}${formatNumber(entry.amount)}</span>
            `}
          </td>
          <td class="px-4 py-3 text-binos-gray">
            ${state.properties.find(p => p.id === entry.property_id)?.scheme_name || entry.property_id}
          </td>
        </tr>
      `;
    }).join('');

    html += `
          </tbody>
        </table>
      </div>
    `;
    return html;
  }

  function showAddEntryModal() {
    state.showAddEntryModal = true;
    rerender();
  }

  function closeAddEntryModal() {
    state.showAddEntryModal = false;
    rerender();
  }

  async function saveNewEntry() {
    try {
      await apiClient.post('/pl-entries', {
        date: state.newEntry.date,
        category: state.newEntry.category,
        description: state.newEntry.description,
        amount: parseFloat(state.newEntry.amount),
        property_id: state.newEntry.property_id,
        deducted_expenses: state.newEntry.deducted_expenses || false,
      });
      closeAddEntryModal();
      await loadData();
    } catch (err) {
      toast.error('Failed to save entry');
    }
  }

  function saveCellChange(id, field, value) {
    const entity = (state.budgets || []).find(b => b.id === id) || (state.monthly || []).find(m => m.id === id) || (state.entries || []).find(e => e.id === id);
    if (!entity) return;

    const updates = {
      budgets: ['amount'],
      monthly: ['amount'],
      entries: ['amount'],
    };

    const updateMap = {
      budgets: '/pl',
      monthly: '/pl-monthly',
      entries: '/pl-entries',
    };

    let targetArray, updateEndpoint;
    if ((state.budgets || []).some(b => b.id === id)) {
      targetArray = state.budgets;
      updateEndpoint = '/pl';
    } else if ((state.monthly || []).some(m => m.id === id)) {
      targetArray = state.monthly;
      updateEndpoint = '/pl-monthly';
    } else if ((state.entries || []).some(e => e.id === id)) {
      targetArray = state.entries;
      updateEndpoint = '/pl-entries';
    }

    if (!targetArray) return;

    const entityToUpdate = targetArray.find(e => e.id === id);
    if (!entityToUpdate) return;

    const updateData = {
      id: entityToUpdate.id,
      property_id: entityToUpdate.property_id,
      category: entityToUpdate.category,
      amount: value,
      last_updated: new Date().toISOString(),
      month: entityToUpdate.month,
      date: entityToUpdate.date,
      description: entityToUpdate.description,
    };

    apiClient.put(updateEndpoint, updateData).then(() => {
      loadData();
    }).catch(err => {
      toast.error('Failed to update');
      loadData();
    });
  }

  function updateNewEntry(field, value) {
    state.newEntry = { ...state.newEntry, [field]: value };
    rerender();
  }

  function renderAddEntryModal() {
    if (!state.showAddEntryModal) return '';

    const selectedCategory = state.newEntry.category;
    const showDeductedExpenses = selectedCategory === 'Rental Income';

    let html = `
      <div class="modal-overlay" onclick="() => closeAddEntryModal()">
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="card-header">
            <h3 class="font-display font-semibold">Add Financial Entry</h3>
            <button class="p-1.5 rounded-lg hover:bg-binos-light" onclick="() => closeAddEntryModal()">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="card-body">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-binos-gray mb-1.5">Date</label>
                <input type="date" class="input-field" value="${state.newEntry.date || new Date().toISOString().split('T')[0]}" onchange="(e => { updateNewEntry('date', e.target.value) })(event)">
              </div>
              <div>
                <label class="block text-sm font-medium text-binos-gray mb-1.5">Category</label>
                <select class="select-field" onchange="(e => { updateNewEntry('category', e.target.value); state.newEntry.deducted_expenses = false; rerender(); })(event)">
                  <option value="">Select category</option>
                  <option value="Rental Income" ${state.newEntry.category === 'Rental Income' ? 'selected' : ''}>Rental Income</option>
                  <option value="Property Tax" ${state.newEntry.category === 'Property Tax' ? 'selected' : ''}>Property Tax</option>
                  <option value="Insurance" ${state.newEntry.category === 'Insurance' ? 'selected' : ''}>Insurance</option>
                  <option value="Maintenance" ${state.newEntry.category === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
                  <option value="Management Fee" ${state.newEntry.category === 'Management Fee' ? 'selected' : ''}>Management Fee</option>
                  <option value="Renovation" ${state.newEntry.category === 'Renovation' ? 'selected' : ''}>Renovation</option>
                  <option value="Security" ${state.newEntry.category === 'Security' ? 'selected' : ''}>Security</option>
                  <option value="Utilities" ${state.newEntry.category === 'Utilities' ? 'selected' : ''}>Utilities</option>
                  <option value="Other Income" ${state.newEntry.category === 'Other Income' ? 'selected' : ''}>Other Income</option>
                </select>
              </div>
              <div class="col-span-2">
                <label class="block text-sm font-medium text-binos-gray mb-1.5">Description</label>
                <input type="text" class="input-field" value="${state.newEntry.description}" onchange="(e => { updateNewEntry('description', e.target.value) })(event)">
              </div>
              <div>
                <label class="block text-sm font-medium text-binos-gray mb-1.5">Amount</label>
                <input type="text" class="input-field" value="${state.newEntry.amount}" onchange="(e => { updateNewEntry('amount', e.target.value) })(event)">
              </div>
              <div>
                <label class="block text-sm font-medium text-binos-gray mb-1.5">Property</label>
                <select class="select-field" onchange="(e => { updateNewEntry('property_id', e.target.value) })(event)">
                  <option value="">Select property</option>
                  ${(state.properties || []).map(p => `<option value="${p.id}" ${state.newEntry.property_id === p.id ? 'selected' : ''}>${p.scheme_name}</option>`).join('')}
                </select>
              </div>
              ${showDeductedExpenses ? `
                <div class="col-span-2">
                  <label class="flex items-center gap-2">
                    <input type="checkbox" class="w-4 h-4 rounded border-binos-border text-binos-blue focus:ring-binos-blue" onchange="(e => { updateNewEntry('deducted_expenses', e.target.checked) })(event)" ${state.newEntry.deducted_expenses ? 'checked' : ''}>
                    <span class="text-sm font-medium">This is a deducted expense</span>
                  </label>
                </div>
              ` : ''}
            </div>
            <div class="flex gap-3 pt-4">
              <button class="btn-secondary flex-1" onclick="() => closeAddEntryModal()">Cancel</button>
              <button class="btn-primary flex-1" onclick="() => saveNewEntry()">Save</button>
            </div>
          </div>
        </div>
      </div>
    `;
    return html;
  }

  function render() {
    const filtered = getFilteredData();

    let html = `
      <div class="space-y-6">
        ${state.loading ? `
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-binos-blue"></div>
          </div>
        ` : ''}

        ${state.error ? `
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <div class="font-medium mb-1">Error loading financial data</div>
            <div class="text-sm">${state.error}</div>
          </div>
        ` : ''}

        ${!state.loading && !state.error ? `
          <div class="kpi-row">
            <div class="kpi-card">
              <div class="text-sm text-binos-gray mb-1">Total Income</div>
              <div class="text-2xl font-display font-bold amount-positive">
                R${((filtered.monthly || []).reduce((sum, m) => sum + (m.income || 0), 0)).toLocaleString('en-ZA')}
              </div>
              <div class="text-xs text-binos-gray mt-1">This ${state.year}</div>
            </div>
            <div class="kpi-card">
              <div class="text-sm text-binos-gray mb-1">Total Expenses</div>
              <div class="text-2xl font-display font-bold amount-negative">
                R${((filtered.monthly || []).reduce((sum, m) => sum + (m.expenses || 0), 0)).toLocaleString('en-ZA')}
              </div>
              <div class="text-xs text-binos-gray mt-1">This ${state.year}</div>
            </div>
            <div class="kpi-card">
              <div class="text-sm text-binos-gray mb-1">Net Profit</div>
              <div class="text-2xl font-display font-bold amount-neutral">
                R${(((filtered.monthly || []).reduce((sum, m) => sum + (m.income || 0), 0) - (filtered.monthly || []).reduce((sum, m) => sum + (m.expenses || 0), 0))).toLocaleString('en-ZA')}
              </div>
              <div class="text-xs text-binos-gray mt-1">This ${state.year}</div>
            </div>
            <div class="kpi-card">
              <div class="text-sm text-binos-gray mb-1">Budget vs Actual</div>
              <div class="text-2xl font-display font-bold amount-positive">
                ${(((filtered.budgets || []).reduce((sum, b) => sum + (b.amount || 0), 0) - (filtered.monthly || []).reduce((sum, m) => sum + (m.amount || 0), 0))).toLocaleString('en-ZA')}
              </div>
              <div class="text-xs text-binos-gray mt-1">Variance</div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="page-title">Financial Dashboard</h3>
              <div class="flex items-center gap-3">
                <select class="select-field text-sm" onchange="(e => { state.filterProp = e.target.value; renderCharts(getFilteredData()); })(event)">
                  <option value="all">All Properties</option>
                  ${(state.properties || []).map(p => `<option value="${p.id}" ${state.filterProp === p.id ? 'selected' : ''}>${p.scheme_name}</option>`).join('')}
                </select>
                <select class="select-field text-sm" onchange="(e => { state.year = parseInt(e.target.value); rerender(); })(event)">
                  ${getUniqueYears().map(y => `<option value="${y}" ${state.year === y ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
                <button class="btn-add btn-sm" onclick="() => showAddEntryModal()">
                  <span class="mr-1">${ICONS.plus}</span> Add Entry
                </button>
              </div>
            </div>
            <div class="card-body">
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 class="text-sm font-medium text-binos-gray mb-3">Income vs Expenses</h4>
                  <div class="h-80">
                    <canvas id="income-chart"></canvas>
                  </div>
                </div>
                <div>
                  <h4 class="text-sm font-medium text-binos-gray mb-3">Budget vs Actual</h4>
                  <div class="h-80">
                    <canvas id="budget-chart"></canvas>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="card">
              <div class="card-header">
                <h3 class="page-title">Budget Breakdown</h3>
                <span class="text-xs text-binos-gray">Click to edit</span>
              </div>
              <div class="card-body">
                ${renderBudgetTable(filtered)}
              </div>
            </div>
            <div class="card">
              <div class="card-header">
                <h3 class="page-title">Monthly Actuals</h3>
              </div>
              <div class="card-body">
                ${renderActualsTable(filtered)}
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="page-title">Financial Entries</h3>
            </div>
            <div class="card-body">
              ${renderEntriesTable(filtered)}
            </div>
          </div>
        ` : ''}

        ${renderAddEntryModal()}
      </div>
    `;

    container.innerHTML = html;

    if (!state.loading && !state.error) {
      renderCharts(filtered);
    }

    attachEventHandlers();
  }

  function attachEventHandlers() {
    document.querySelectorAll('[onchange^="(e => { state.filterProp"]').forEach(el => {
      const handlerText = el.getAttribute('onchange');
      const match = handlerText.match(/\(e => \{[^}]*\}\)/s);
      if (match) {
        const fnStr = match[0];
        const newFn = new Function('e', `return ${fnStr}`);
        el.onchange = (e) => newFn(e);
      }
    });

    document.querySelectorAll('[onchange^="(e => { state.year"]').forEach(el => {
      const handlerText = el.getAttribute('onchange');
      const match = handlerText.match(/\(e => \{[^}]*\}\)/s);
      if (match) {
        const fnStr = match[0];
        const newFn = new Function('e', `return ${fnStr}`);
        el.onchange = (e) => newFn(e);
      }
    });

    document.querySelectorAll('[onclick^="() => showAddEntryModal"]').forEach(el => {
      el.onclick = () => showAddEntryModal();
    });

    document.querySelectorAll('[onclick^="() => closeAddEntryModal"]').forEach(el => {
      el.onclick = () => closeAddEntryModal();
    });

    document.querySelectorAll('[onclick^="() => saveNewEntry"]').forEach(el => {
      el.onclick = () => saveNewEntry();
    });

    document.querySelectorAll('[onchange^="(e => { updateNewEntry"]').forEach(el => {
      const handlerText = el.getAttribute('onchange');
      const match = handlerText.match(/updateNewEntry\('([^']+)',\s*e\.target\.value\)/);
      if (match) {
        const field = match[1];
        el.onchange = (e) => updateNewEntry(field, e.target.value);
      }
    });

    document.querySelectorAll('[onclick^="() => saveCellChange"]').forEach(el => {
      const handlerText = el.getAttribute('onclick');
      const match = handlerText.match(/saveCellChange\('([^']+)',\s*'([^']+)'/);
      if (match) {
        const id = match[1];
        const field = match[2];
        el.onclick = (e) => {
          const input = el.closest('td').querySelector('input');
          if (input) {
            const value = input.value;
            if (/^-?\d*\.?\d*$/.test(value || '')) {
              saveCellChange(id, field, parseFloat(value));
            }
          }
        };
      }
    });

    document.querySelectorAll('[onchange^="(e => { state.editingValue"]').forEach(el => {
      const handlerText = el.getAttribute('onchange');
      const match = handlerText.match(/\(e => \{[^}]*\}\)/s);
      if (match) {
        const fnStr = match[0];
        const newFn = new Function('e', `return ${fnStr}`);
        el.onchange = (e) => newFn(e);
      }
    });

    document.querySelectorAll('[onblur^="(e => { if (/^"]').forEach(el => {
      const handlerText = el.getAttribute('onblur');
      const match = handlerText.match(/\(e => \{[^}]*\}\)/s);
      if (match) {
        const fnStr = match[0];
        const newFn = new Function('e', `return ${fnStr}`);
        el.onblur = (e) => newFn(e);
      }
    });

    document.querySelectorAll('[onkeypress^="(e => { if (e.key ==="]').forEach(el => {
      const handlerText = el.getAttribute('onkeypress');
      const match = handlerText.match(/\(e => \{[^}]*\}\)/s);
      if (match) {
        const fnStr = match[0];
        const newFn = new Function('e', `return ${fnStr}`);
        el.onkeypress = (e) => newFn(e);
      }
    });

    document.querySelectorAll('[onchange^="(e => { state.newEntry"]').forEach(el => {
      const handlerText = el.getAttribute('onchange');
      const match = handlerText.match(/updateNewEntry\('([^']+)',\s*e\.target\.value\)/);
      if (match) {
        const field = match[1];
        el.onchange = (e) => updateNewEntry(field, e.target.value);
      }
    });

    document.querySelectorAll('[onclick^="(e => { state.filterProp"]').forEach(el => {
      const handlerText = el.getAttribute('onclick');
      const match = handlerText.match(/\(e => \{[^}]*\}\)/s);
      if (match) {
        const fnStr = match[0];
        const newFn = new Function('e', `return ${fnStr}`);
        el.onclick = (e) => newFn(e);
      }
    });

    document.querySelectorAll('[onclick^="(e => { state.year"]').forEach(el => {
      const handlerText = el.getAttribute('onclick');
      const match = handlerText.match(/\(e => \{[^}]*\}\)/s);
      if (match) {
        const fnStr = match[0];
        const newFn = new Function('e', `return ${fnStr}`);
        el.onclick = (e) => newFn(e);
      }
    });

    document.querySelectorAll('[onclick^="(e =>"]").forEach(el => {
      const fullText = el.getAttribute('onclick');
      if (fullText.includes('(e => {')) {
        const handlerCode = fullText.match(/\(e => \{[^}]*\}\)/s)[0];
        const newFn = new Function('e', `return ${handlerCode}`);
        el.onclick = (e) => newFn(e);
      }
    });

    document.querySelectorAll('[disabled="disabled"][onclick^="(e =>"]").forEach(el => {
      const fullText = el.getAttribute('onclick');
      if (fullText.includes('(e => {')) {
        const handlerCode = fullText.match(/\(e => \{[^}]*\}\)/s)[0];
        const newFn = new Function('e', `return ${handlerCode}`);
        el.onclick = (e) => {
          if (!el.disabled) {
            newFn(e);
          }
        };
      }
    });
  }

  function rerender() {
    render();
  }

  loadData();
}
