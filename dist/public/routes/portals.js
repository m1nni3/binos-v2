import { escHtml } from '../lib/utils.js';

export function renderPortals(container) {
  let loading = true;
  let error = null;
  let portals = [];
  let visible = {};
  let copied = null;
  let editingId = null;
  let showAdd = false;
  let editForm = { type: '', name: '', username: '', password: '', url: '' };

  async function load() {
    loading = true;
    error = null;
    render();
    try {
      const res = await fetch('/api/portals');
      if (!res.ok) throw new Error('Failed to load portals');
      portals = await res.json();
      loading = false;
      render();
    } catch (e) {
      error = e.message;
      loading = false;
      render();
    }
  }

  function toggleVisible(id) { visible[id] = !visible[id]; render(); }

  function copyText(text, id) {
    navigator.clipboard.writeText(text).then(() => {
      copied = id;
      render();
      setTimeout(() => { copied = null; render(); }, 2000);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      copied = id;
      render();
      setTimeout(() => { copied = null; render(); }, 2000);
    });
  }

  function startEdit(p) {
    editingId = p.id;
    editForm = { type: p.type, name: p.name, username: p.username, password: p.password, url: p.url };
    showAdd = false;
    render();
  }

  async function saveEdit() {
    try {
      const body = editForm;
      if (editingId) {
        const res = await fetch('/api/portals/' + editingId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to update portal');
        portals = portals.map(p => p.id === editingId ? { ...p, ...editForm } : p);
      } else {
        const res = await fetch('/api/portals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to create portal');
        const portal = await res.json();
        portals.push(portal);
      }
      editingId = null;
      showAdd = false;
      editForm = { type: '', name: '', username: '', password: '', url: '' };
      await load();
    } catch (e) {
      error = e.message;
      render();
    }
  }

  function cancelEdit() { editingId = null; showAdd = false; render(); }

  function renderForm(prefix) {
    return '<div class="grid grid-cols-2 gap-3">' +
      '<div><label class="block text-xs text-binos-gray mb-1">Type</label><input class="input-field text-sm" data-' + prefix + '-type value="' + escHtml(editForm.type) + '"></div>' +
      '<div><label class="block text-xs text-binos-gray mb-1">Name</label><input class="input-field text-sm" data-' + prefix + '-name value="' + escHtml(editForm.name) + '"></div>' +
      '<div><label class="block text-xs text-binos-gray mb-1">Username</label><input class="input-field text-sm" data-' + prefix + '-user value="' + escHtml(editForm.username) + '"></div>' +
      '<div><label class="block text-xs text-binos-gray mb-1">Password</label><input class="input-field text-sm" type="text" data-' + prefix + '-pass value="' + escHtml(editForm.password) + '"></div>' +
      '<div class="col-span-2"><label class="block text-xs text-binos-gray mb-1">URL</label><input class="input-field text-sm" data-' + prefix + '-url value="' + escHtml(editForm.url) + '"></div></div>';
  }

  function render() {
    if (loading) {
      container.innerHTML = '<div class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-binos-blue border-t-transparent rounded-full"></div></div>';
      return;
    }

    if (error) {
      container.innerHTML = '<div class="flex items-center justify-center py-20 text-binos-red">' + escHtml(error) + '</div>';
      return;
    }

    let html = '<div class="space-y-6"><div class="flex items-center justify-between"><h2 class="page-title">Portal Passwords</h2>' +
      '<p class="text-sm text-binos-gray">Encrypted, stored in cloud database</p></div><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';

    portals.forEach(p => {
      if (editingId === p.id) {
        html += '<div class="card p-4 border-2 border-binos-blue"><div class="flex items-center justify-between mb-3">' +
          '<span class="font-medium">Edit: ' + escHtml(p.name) + '</span></div>' + renderForm('edit') +
          '<div class="flex gap-2 mt-3"><button class="btn-primary btn-sm" data-save-edit>Save</button>' +
          '<button class="btn-secondary btn-sm" data-cancel-edit>Cancel</button></div></div>';
        return;
      }

      const show = visible[p.id];
      html += '<div class="card p-4">' +
        '<div class="flex items-start justify-between mb-3"><div><span class="badge badge-blue">' + escHtml(p.type) + '</span></div>' +
        '<button class="text-binos-gray hover:text-binos-blue" data-edit-portal="' + p.id + '"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button></div>' +
        '<h3 class="font-medium mb-3">' + escHtml(p.name) + '</h3>' +
        '<div class="space-y-2 text-sm">' +
        '<div class="flex items-center justify-between"><span class="text-binos-gray">' + escHtml(p.username) + '</span>' +
        '<button class="text-xs text-binos-blue hover:underline" data-copy-user="' + p.id + '">' + (copied === 'u' + p.id ? 'Copied!' : 'Copy') + '</button></div>' +
        '<div class="flex items-center justify-between"><span class="text-binos-gray">' + (show ? escHtml(p.password) : '••••••••') + '</span>' +
        '<div class="flex gap-1"><button class="text-xs text-binos-gray hover:text-binos-blue" data-toggle-vis="' + p.id + '">' + (show ? 'Hide' : 'Show') + '</button>' +
        '<button class="text-xs text-binos-blue hover:underline" data-copy-pass="' + p.id + '">' + (copied === 'p' + p.id ? 'Copied!' : 'Copy') + '</button></div></div>' +
        '</div>' +
        (p.url ? '<a href="' + (p.url.startsWith('http://') || p.url.startsWith('https://') ? escHtml(p.url) : '#') + '" target="_blank" rel="noopener noreferrer" class="inline-block mt-3 text-xs text-binos-blue hover:underline">Open ' + escHtml(p.name) + ' &rarr;</a>' : '') +
        '</div>';
    });

    if (showAdd) {
      html += '<div class="card p-4 border-2 border-binos-green"><div class="font-medium mb-3">Add Portal</div>' + renderForm('add') +
        '<div class="flex gap-2 mt-3"><button class="btn-primary btn-sm" data-save-add>Save</button>' +
        '<button class="btn-secondary btn-sm" data-cancel-add>Cancel</button></div></div>';
    } else {
      html += '<button class="card p-4 border-2 border-dashed border-binos-border flex items-center justify-center text-binos-gray hover:border-binos-green hover:text-binos-green transition-colors" data-add-portal>' +
        '<div class="text-center"><svg class="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg><div class="text-sm">Add Portal</div></div></button>';
    }

    html += '</div></div>';
    container.innerHTML = html;
    attachEvents();
  }

  function attachEvents() {
    container.querySelectorAll('[data-toggle-vis]').forEach(btn => {
      btn.onclick = () => toggleVisible(btn.dataset.toggleVis);
    });
    container.querySelectorAll('[data-copy-user]').forEach(btn => {
      btn.onclick = () => {
        const p = portals.find(x => x.id == btn.dataset.copyUser);
        if (p) copyText(p.username, 'u' + p.id);
      };
    });
    container.querySelectorAll('[data-copy-pass]').forEach(btn => {
      btn.onclick = () => {
        const p = portals.find(x => x.id == btn.dataset.copyPass);
        if (p) copyText(p.password, 'p' + p.id);
      };
    });
    container.querySelectorAll('[data-edit-portal]').forEach(btn => {
      btn.onclick = () => {
        const p = portals.find(x => x.id == btn.dataset.editPortal);
        if (p) startEdit(p);
      };
    });
    container.querySelector('[data-save-edit]')?.addEventListener('click', () => {
      editForm.type = container.querySelector('[data-edit-type]').value;
      editForm.name = container.querySelector('[data-edit-name]').value;
      editForm.username = container.querySelector('[data-edit-user]').value;
      editForm.password = container.querySelector('[data-edit-pass]').value;
      editForm.url = container.querySelector('[data-edit-url]').value;
      saveEdit();
    });
    container.querySelector('[data-cancel-edit]')?.addEventListener('click', cancelEdit);
    container.querySelector('[data-add-portal]')?.addEventListener('click', () => {
      editingId = null;
      showAdd = true;
      editForm = { type: '', name: '', username: '', password: '', url: '' };
      render();
    });
    container.querySelector('[data-save-add]')?.addEventListener('click', () => {
      editForm.type = container.querySelector('[data-add-type]').value;
      editForm.name = container.querySelector('[data-add-name]').value;
      editForm.username = container.querySelector('[data-add-user]').value;
      editForm.password = container.querySelector('[data-add-pass]').value;
      editForm.url = container.querySelector('[data-add-url]').value;
      saveEdit();
    });
    container.querySelector('[data-cancel-add]')?.addEventListener('click', cancelEdit);
  }

  load();
}
