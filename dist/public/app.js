import { initCache, getState } from './lib/cache.js';
import { ICONS } from './lib/icons.js';
import { toast } from './lib/toast.js';
import { renderProperties } from './routes/properties.js';
import { renderFinances } from './routes/finances.js';
import { renderContacts } from './routes/contacts.js';
import { renderMaintenance } from './routes/maintenance.js';
import { renderPettyCash } from './routes/petty-cash.js';
import { renderDebrief } from './routes/debrief.js';
import { renderTasks } from './routes/tasks.js';
import { renderPortals } from './routes/portals.js';
import { renderActivity } from './routes/activity.js';
import { renderTenants } from './routes/tenants.js';
import { renderSettings, applyBranding } from './routes/settings.js';

const NAV_SECTIONS = [
  {
    label: 'Management',
    items: [
      { name: 'Properties', path: '/properties', icon: 'building2', color: 'blue' },
      { name: 'Finances', path: '/finances', icon: 'chart', color: 'green' },
      { name: 'Contacts', path: '/contacts', icon: 'phone', color: 'orange' },
      { name: 'Maintenance', path: '/maintenance', icon: 'wrench', color: 'yellow' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Petty Cash', path: '/petty-cash', icon: 'wallet', color: 'purple' },
      { name: 'Tasks', path: '/tasks', icon: 'check', color: 'teal' },
      { name: 'Activity', path: '/activity', icon: 'bell', color: 'pink' },
      { name: 'Tenants', path: '/tenants', icon: 'user', color: 'green' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { name: 'Debrief', path: '/debrief', icon: 'message', color: 'cyan' },
    ],
  },
];

const ROUTES = {
  '/properties': renderProperties,
  '/finances': renderFinances,
  '/contacts': renderContacts,
  '/maintenance': renderMaintenance,
  '/petty-cash': renderPettyCash,
  '/debrief': renderDebrief,
  '/tasks': renderTasks,
  '/portals': renderPortals,
  '/activity': renderActivity,
  '/tenants': renderTenants,
  '/settings': renderSettings,
};

let currentRoute = location.pathname || '/properties';
let sidebarOpen = false;

function navigate(path) {
  currentRoute = path;
  history.pushState({}, '', path);
  renderContent();
  if (sidebarOpen) toggleSidebar();
}

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  const aside = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebarOpen) {
    aside.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
  } else {
    aside.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
  }
}

function renderLayout() {
  const settings = JSON.parse(localStorage.getItem('POMP_SETTINGS') || '{}');

  const navHtml = NAV_SECTIONS.map(section => `
    <div class="mb-6">
      <div class="px-3 mb-2 text-xs font-semibold text-binos-gray uppercase tracking-wider">${section.label}</div>
      ${section.items.map(item => `
        <a href="${item.path}" data-nav="${item.path}" class="sidebar-link ${currentRoute === item.path ? 'active' : ''} mb-1">
          <span class="sidebar-icon-${item.color}">${ICONS[item.icon]}</span>
          <span>${item.name}</span>
        </a>
      `).join('')}
    </div>
  `).join('');

  document.getElementById('app').innerHTML = `
    <div id="sidebar-overlay" class="fixed inset-0 bg-black/50 z-40 hidden lg:hidden" onclick="document.getElementById('sidebar-toggle').click()"></div>
    <aside id="sidebar" class="fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-binos-sidebar-gradient-from to-binos-sidebar-gradient-to transform -translate-x-full transition-transform duration-300 lg:translate-x-0 flex flex-col">
      <div class="flex items-center gap-3 px-5 py-5 border-b border-white/10 sidebar-logo-area">
        ${settings.logo
          ? `<img src="${settings.logo}" class="h-9 w-auto max-w-[160px] object-contain">`
          : `<div class="w-9 h-9 rounded-lg bg-gradient-to-br from-binos-blue to-binos-purple flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            </div>
            <div>
              <div class="text-white font-display font-bold text-lg leading-tight">Binos</div>
              <div class="text-binos-gray text-xs">Property Management</div>
            </div>`
        }
      </div>
      <nav class="flex-1 overflow-y-auto px-3 py-4">
        ${navHtml}
        <div class="mt-auto border-t border-white/10 pt-4 space-y-1">
          <a href="/portals" data-nav="/portals" class="sidebar-link ${currentRoute === '/portals' ? 'active' : ''} mb-1">
            <span class="sidebar-icon-cyan">${ICONS.globe}</span>
            <span>Portals</span>
          </a>
          <a href="/settings" data-nav="/settings" class="sidebar-link ${currentRoute === '/settings' ? 'active' : ''} mb-1">
            <span class="sidebar-icon-gray">${ICONS.settings}</span>
            <span>Settings</span>
          </a>
        </div>
      </nav>
    </aside>
    <div class="lg:ml-64 min-h-screen">
      <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-binos-border">
        <div class="flex items-center justify-between px-4 lg:px-6 py-3">
          <div class="flex items-center gap-3">
            <button id="sidebar-toggle" class="lg:hidden p-2 rounded-lg hover:bg-binos-light" onclick="document.getElementById('sidebar-toggle').dispatchEvent(new CustomEvent('toggle-sidebar'))">
              ${ICONS.menu}
            </button>
            <div class="relative hidden sm:block">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-binos-gray">${ICONS.search}</span>
              <input id="global-search" type="text" placeholder="Search properties, contacts..." class="pl-10 pr-4 py-2 bg-binos-light border-0 rounded-lg text-sm w-64 focus:ring-2 focus:ring-binos-blue/30 focus:outline-none">
            </div>
          </div>
          <div class="flex items-center gap-4">
            <button class="relative p-2 rounded-lg hover:bg-binos-light">
              ${ICONS.bell}
              <span class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-binos-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
            </button>
            <div class="flex items-center gap-2 pl-4 border-l border-binos-border">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-binos-blue to-binos-purple flex items-center justify-center">
                <span class="text-white text-sm font-medium">MP</span>
              </div>
              <span class="hidden sm:inline text-sm font-medium">MP</span>
            </div>
          </div>
        </div>
      </header>
      <main id="page-content" class="p-4 lg:p-6"></main>
    </div>
  `;

  document.getElementById('sidebar-toggle').addEventListener('toggle-sidebar', toggleSidebar);

  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        sessionStorage.setItem('globalSearch', e.target.value.trim());
        navigate('/properties');
      }
    });
  }

  document.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigate(link.dataset.nav);
    });
  });

  window.addEventListener('popstate', () => {
    currentRoute = location.pathname;
    renderContent();
  });
}

function updateSidebarLogo(settings) {
  const area = document.querySelector('#sidebar .sidebar-logo-area');
  if (!area) return;
  if (settings.logo) {
    area.innerHTML = '<img src="' + settings.logo + '" class="h-9 w-auto max-w-[160px] object-contain">';
  } else {
    area.innerHTML =
      '<div class="w-9 h-9 rounded-lg bg-gradient-to-br from-binos-blue to-binos-purple flex items-center justify-center">' +
        '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>' +
      '</div>' +
      '<div>' +
        '<div class="text-white font-display font-bold text-lg leading-tight">Binos</div>' +
        '<div class="text-binos-gray text-xs">Property Management</div>' +
      '</div>';
  }
}

function renderContent() {
  const container = document.getElementById('page-content');
  const renderer = ROUTES[currentRoute] || renderProperties;
  try {
    container.innerHTML = '';
    renderer(container);
  } catch (err) {
    container.innerHTML = '<div class="flex items-center justify-center py-20"><div class="text-center"><div class="text-red-600 text-lg font-medium mb-2">Something went wrong</div><div class="text-binos-gray text-sm">' + (err.message || 'Unknown error') + '</div></div></div>';
    toast.error('Failed to render page: ' + (err.message || 'Unknown error'));
  }
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.classList.toggle('active', link.dataset.nav === currentRoute);
  });
}

applyBranding();
renderLayout();
renderContent();
initCache();
window.addEventListener('pomp-settings-changed', (e) => updateSidebarLogo(e.detail));

window.addEventListener('unhandledrejection', (e) => {
  toast.error('An unexpected error occurred');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
