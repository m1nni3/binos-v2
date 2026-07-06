import { apiClient, formatCurrency, formatDate, escHtml } from '../lib/utils.js';
import { toast } from '../lib/toast.js';

export function renderPettyCash(container) {
  let data = { income: [], expenses: [] };
  let filterProp = 'all';
  let properties = [];
  let showIncome = false;
  let showExpense = false;
  let incForm = { amount: '', description: '', property_id: '', date: new Date().toISOString().split('T')[0] };
  let expForm = { amount: '', description: '', property_id: '', date: new Date().toISOString().split('T')[0], category: '' };

  async function loadData() {
    try {
      const [inc, exp, props] = await Promise.all([
        apiClient.get('/petty-cash/income'),
        apiClient.get('/petty-cash/expenses'),
        apiClient.get('/properties'),
      ]);
      data.income = Array.isArray(inc) ? inc : [];
      data.expenses = Array.isArray(exp) ? exp : [];
      properties = props || [];
    } catch (e) { toast.error('Failed to load petty cash'); }
    render();
  }

  function filteredIncome() {
    return data.income.filter(i => filterProp === 'all' || i.property_id === filterProp);
  }
  function filteredExpenses() {
    return data.expenses.filter(e => filterProp === 'all' || e.property_id === filterProp);
  }

  function totalIncome() { return filteredIncome().reduce((s, i) => s + (parseFloat(i.amount) || 0), 0); }
  function totalExpenses() { return filteredExpenses().reduce((s, e) => s + (parseFloat(e.amount) || 0), 0); }
  function balance() { return totalIncome() - totalExpenses(); }

  function propName(id) { return properties.find(p => p.id === id)?.scheme_name || 'Unknown'; }

  async function addIncome() {
    if (!incForm.amount) return;
    try {
      await apiClient.post('/petty-cash/income', { ...incForm, amount: parseFloat(incForm.amount) });
      incForm = { amount: '', description: '', property_id: '', date: new Date().toISOString().split('T')[0] };
      showIncome = false;
      loadData();
    } catch (e) { toast.error('Failed to add income'); }
  }

  async function addExpense() {
    if (!expForm.amount) return;
    try {
      await apiClient.post('/petty-cash/expenses', { ...expForm, amount: parseFloat(expForm.amount) });
      expForm = { amount: '', description: '', property_id: '', date: new Date().toISOString().split('T')[0], category: '' };
      showExpense = false;
      loadData();
    } catch (e) { toast.error('Failed to add expense'); }
  }

  async function deleteItem(type, id) {
    if (!confirm('Delete this entry?')) return;
    try {
      await apiClient.del('/petty-cash/' + type + '/' + id);
      loadData();
    } catch (e) { toast.error('Failed to delete entry'); }
  }

  function render() {
    const ti = totalIncome(), te = totalExpenses(), bal = balance();
    const allEntries = [
      ...filteredIncome().map(e => ({ ...e, type: 'income' })),
      ...filteredExpenses().map(e => ({ ...e, type: 'expense' })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = '<div class="space-y-6">';
    html += '<div class="kpi-row">' +
      '<div class="kpi-card border-l-binos-green"><div class="text-sm text-binos-gray mb-1">Total Income</div><div class="text-2xl font-display font-bold amount-positive">' + formatCurrency(ti) + '</div></div>' +
      '<div class="kpi-card border-l-binos-red"><div class="text-sm text-binos-gray mb-1">Total Expenses</div><div class="text-2xl font-display font-bold amount-negative">' + formatCurrency(te) + '</div></div>' +
      '<div class="kpi-card border-l-binos-blue"><div class="text-sm text-binos-gray mb-1">Balance</div><div class="text-2xl font-display font-bold amount-neutral">' + formatCurrency(bal) + '</div></div>' +
      '</div>';

    html += '<div class="flex items-center gap-3">' +
      '<select class="select-field py-2 text-sm" data-filter-prop><option value="all">All Properties</option>' +
      properties.map(p => '<option value="' + p.id + '"' + (filterProp === p.id ? ' selected' : '') + '>' + p.scheme_name + '</option>').join('') + '</select>' +
      '<button class="btn-add btn-sm" data-toggle-income>+ Income</button>' +
      '<button class="btn-secondary btn-sm" data-toggle-expense>+ Expense</button></div>';

    if (showIncome) {
      html += '<div class="card p-4"><h4 class="font-medium mb-3">Add Income</h4><div class="grid grid-cols-2 gap-3">' +
        '<input class="input-field" placeholder="Amount" data-inc-amount value="' + incForm.amount + '">' +
        '<input class="input-field" type="date" data-inc-date value="' + incForm.date + '">' +
        '<input class="input-field col-span-2" placeholder="Description" data-inc-desc value="' + incForm.description + '">' +
        '<select class="select-field" data-inc-prop><option value="">Property</option>' + properties.map(p => '<option value="' + p.id + '">' + p.scheme_name + '</option>').join('') + '</select>' +
        '</div><div class="flex gap-3 mt-3"><button class="btn-primary btn-sm" data-save-income>Save</button><button class="btn-secondary btn-sm" data-cancel-income>Cancel</button></div></div>';
    }

    if (showExpense) {
      html += '<div class="card p-4"><h4 class="font-medium mb-3">Add Expense</h4><div class="grid grid-cols-2 gap-3">' +
        '<input class="input-field" placeholder="Amount" data-exp-amount value="' + expForm.amount + '">' +
        '<input class="input-field" type="date" data-exp-date value="' + expForm.date + '">' +
        '<input class="input-field col-span-2" placeholder="Description" data-exp-desc value="' + expForm.description + '">' +
        '<select class="select-field" data-exp-prop><option value="">Property</option>' + properties.map(p => '<option value="' + p.id + '">' + p.scheme_name + '</option>').join('') + '</select>' +
        '<input class="input-field" placeholder="Category" data-exp-cat value="' + expForm.category + '">' +
        '</div><div class="flex gap-3 mt-3"><button class="btn-primary btn-sm" data-save-expense>Save</button><button class="btn-secondary btn-sm" data-cancel-expense>Cancel</button></div></div>';
    }

    html += '<div class="card"><div class="card-header"><h3 class="font-medium">Entries</h3></div><div class="divide-y divide-binos-border/50">';
    if (allEntries.length === 0) {
      html += '<div class="p-6 text-center text-binos-gray">No entries found</div>';
    } else {
      allEntries.forEach(e => {
        const isInc = e.type === 'income';
        html += '<div class="flex items-center justify-between px-5 py-3 border-l-4 ' + (isInc ? 'border-l-binos-green' : 'border-l-binos-red') + '">' +
          '<div><div class="font-medium text-sm">' + escHtml(e.description) + '</div>' +
          '<div class="text-xs text-binos-gray">' + propName(e.property_id) + ' &middot; ' + formatDate(e.date) + '</div></div>' +
          '<div class="flex items-center gap-3"><span class="font-semibold ' + (isInc ? 'amount-positive' : 'amount-negative') + '">' + (isInc ? '+' : '-') + formatCurrency(e.amount) + '</span>' +
          '<button class="text-binos-gray hover:text-binos-red" data-delete="' + e.type + '-' + e.id + '"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div></div>';
      });
    }
    html += '</div></div></div>';
    container.innerHTML = html;
    attachEvents();
  }

  function attachEvents() {
    const fp = container.querySelector('[data-filter-prop]');
    if (fp) fp.onchange = () => { filterProp = fp.value; render(); };
    container.querySelector('[data-toggle-income]')?.addEventListener('click', () => { showIncome = !showIncome; render(); });
    container.querySelector('[data-toggle-expense]')?.addEventListener('click', () => { showExpense = !showExpense; render(); });
    container.querySelector('[data-save-income]')?.addEventListener('click', () => {
      incForm.amount = container.querySelector('[data-inc-amount]').value;
      incForm.description = container.querySelector('[data-inc-desc]').value;
      incForm.date = container.querySelector('[data-inc-date]').value;
      incForm.property_id = container.querySelector('[data-inc-prop]').value;
      addIncome();
    });
    container.querySelector('[data-cancel-income]')?.addEventListener('click', () => { showIncome = false; render(); });
    container.querySelector('[data-save-expense]')?.addEventListener('click', () => {
      expForm.amount = container.querySelector('[data-exp-amount]').value;
      expForm.description = container.querySelector('[data-exp-desc]').value;
      expForm.date = container.querySelector('[data-exp-date]').value;
      expForm.property_id = container.querySelector('[data-exp-prop]').value;
      expForm.category = container.querySelector('[data-exp-cat]').value;
      addExpense();
    });
    container.querySelector('[data-cancel-expense]')?.addEventListener('click', () => { showExpense = false; render(); });
    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [type, id] = btn.dataset.delete.split('-');
        deleteItem(type === 'income' ? 'income' : 'expenses', id);
      });
    });
  }

  loadData();
}
