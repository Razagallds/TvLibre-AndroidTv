/**
 * TV Libre — Frontend Application (Expo Mobile/TV Edition)
 * Vanilla JS · hls.js integrado · Fallback local para Expo
 */

'use strict';

// ─── Config ──────────────────────────────────────────────────────────────────
// En Expo, intentaremos cargar primero desde la API, y si falla (como ocurrirá localmente),
// usaremos el archivo JSON local en la carpeta assets.
const API_BASE = '../api/channels.php';
const LOCAL_DATA = 'data/cache_channels_v22.json'; // Ajustado para la estructura de assets de Expo

const CATEGORY_COLORS = {
  'Noticias':     '#6c63ff',
  'Deportes':     '#43c6ac',
  'Documentales': '#ff9f43',
  'General':      '#9898b8',
  'Ciencia':      '#48dbfb',
  'Entretenimiento': '#ff6584',
  'Música':       '#f368e0',
  'Infantil':     '#ffd32a',
  'Películas':    '#e84393',
};

const CATEGORY_EMOJI = {
  'Noticias':        '📰',
  'Deportes':        '⚽',
  'Documentales':    '🎬',
  'General':         '📺',
  'Ciencia':         '🔬',
  'Entretenimiento': '🎭',
  'Música':          '🎵',
  'Infantil':        '🧸',
  'Películas':       '🎥',
};

// ─── Estado ───────────────────────────────────────────────────────────────────
let allChannels   = [];
let filteredChannels = [];
let activeCategory  = 'all';
let searchQuery     = '';
let hlsInstance     = null;
let currentChannel  = null;
let retryTimer      = null;

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const dom = {
  grid:          $('channelsGrid'),
  pills:         $('categoryPills'),
  searchInput:   $('searchInput'),
  btnRefresh:    $('btnRefresh'),
  emptyState:    $('emptyState'),
  btnClear:      $('btnClear'),
  channelCount:  $('channelCount'),
  statTotal:     $('statTotal'),
  statCategories:$('statCategories'),
  statFiltered:  $('statFiltered'),
  overlay:       $('playerOverlay'),
  playerTitle:   $('playerTitle'),
  playerCategory:$('playerCategory'),
  playerClose:   $('playerClose'),
  playerLoading: $('playerLoading'),
  playerError:   $('playerError'),
  playerErrorMsg:$('playerErrorMsg'),
  btnRetry:      $('btnRetry'),
  video:         $('videoPlayer'),
  footerYear:    $('footerYear'),
};

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (dom.footerYear) dom.footerYear.textContent = new Date().getFullYear();
  fetchChannels();
  bindEvents();
});

// ─── Eventos DOM ──────────────────────────────────────────────────────────────
function bindEvents() {
  dom.searchInput.addEventListener('input', debounce(onSearch, 280));
  dom.btnRefresh.addEventListener('click', () => {
    dom.btnRefresh.classList.add('spinning');
    fetchChannels(true).finally(() => dom.btnRefresh.classList.remove('spinning'));
  });
  dom.playerClose.addEventListener('click', closePlayer);
  dom.overlay.addEventListener('click', e => { if (e.target === dom.overlay) closePlayer(); });
  dom.btnRetry.addEventListener('click', () => currentChannel && openPlayer(currentChannel));
  if (dom.btnClear) dom.btnClear.addEventListener('click', clearFilters);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !dom.overlay.hidden) closePlayer();
  });
}

// ─── Fetch channels ───────────────────────────────────────────────────────────
async function fetchChannels(force = false) {
  showSkeletons();

  try {
    // Intentar primero la API (por si está en un servidor remoto)
    let res;
    try {
      res = await fetch(API_BASE + '?action=channels');
    } catch (e) {
      console.warn('[TVLibre] API no disponible, usando datos locales.');
    }

    if (!res || !res.ok) {
      // Fallback a JSON local en Expo
      res = await fetch(LOCAL_DATA);
    }

    if (!res.ok) throw new Error(`No se pudo cargar la lista de canales.`);

    const json = await res.json();
    allChannels = json.data ?? json; // Soporta tanto {data:[]} como []

    if (!Array.isArray(allChannels)) {
        // Si el JSON local es el objeto cache completo
        if (allChannels.channels) allChannels = allChannels.channels;
        else allChannels = Object.values(allChannels).filter(v => typeof v === 'object' && v.url);
    }

    buildCategoryPills();
    applyFilters();
    updateStats();

    if (dom.channelCount) animateNumber(dom.channelCount, allChannels.length);

  } catch (err) {
    console.error('[TVLibre]', err);
    showGridError(err.message);
  }
}

// ─── Filtros ──────────────────────────────────────────────────────────────────
function applyFilters() {
  const q = searchQuery.toLowerCase().trim();

  filteredChannels = allChannels.filter(ch => {
    const matchCat    = activeCategory === 'all' || ch.category === activeCategory;
    const matchSearch = !q ||
      (ch.name || '').toLowerCase().includes(q) ||
      (ch.category || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  renderChannels(filteredChannels);
  if (dom.statFiltered) dom.statFiltered.textContent = filteredChannels.length;
}

function onSearch(e) {
  searchQuery = e.target.value;
  applyFilters();
}

function clearFilters() {
  searchQuery     = '';
  activeCategory  = 'all';
  dom.searchInput.value = '';
  document.querySelectorAll('.pill').forEach(p => {
    p.classList.toggle('pill--active', p.dataset.category === 'all');
    p.setAttribute('aria-selected', p.dataset.category === 'all');
  });
  applyFilters();
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderChannels(channels) {
  dom.grid.innerHTML = '';

  if (channels.length === 0) {
    if (dom.emptyState) dom.emptyState.hidden = false;
    return;
  }

  if (dom.emptyState) dom.emptyState.hidden = true;

  channels.forEach((ch, i) => {
    const card = buildCard(ch, i);
    dom.grid.appendChild(card);
  });
}

function buildCard(ch, index) {
  const li = document.createElement('article');
  li.className  = 'channel-card';
  li.setAttribute('role', 'listitem');
  li.setAttribute('tabindex', '0');
  li.setAttribute('aria-label', `Reproducir ${ch.name}`);
  li.style.animationDelay = `${Math.min(index * 0.04, 0.5)}s`;

  const emoji  = CATEGORY_EMOJI[ch.category] ?? '📺';

  li.innerHTML = `
    <div class="card-logo-wrap">
      ${ch.logo
        ? `<img class="card-logo" src="${escapeHtml(ch.logo)}"
               alt="${escapeHtml(ch.name)}"
               onerror="this.parentElement.innerHTML='<span class=\\'card-logo-fallback\\'>${emoji}</span>'" />`
        : `<span class="card-logo-fallback">${emoji}</span>`
      }
    </div>
    <div class="card-info" style="text-align: center; display: flex; flex-direction: column; gap: 0.25rem;">
      <div class="card-name" style="white-space: normal; text-transform: uppercase; font-size: 0.85rem; font-weight: 700;">${escapeHtml(ch.name)}</div>
    </div>
    <div style="position: absolute; top: 12px; left: 12px;">
      <span class="live-dot" style="background: rgba(212, 175, 55, 0.15); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(212, 175, 55, 0.3); font-size: 0.65rem; color: var(--accent-1); display: inline-flex; align-items: center; gap: 4px; font-weight: 700;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent-1); animation: blink 1.5s infinite;"></span>
        EN VIVO
      </span>
    </div>
  `;

  li.addEventListener('click', () => openPlayer(ch));
  li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openPlayer(ch); });

  return li;
}

function buildCategoryPills() {
  const categories = [...new Set(allChannels.map(c => c.category).filter(Boolean))].sort();
  const existingAll = dom.pills.querySelector('[data-category="all"]');
  dom.pills.innerHTML = '';
  dom.pills.appendChild(existingAll ?? createPill('all', 'Todos'));
  categories.forEach(cat => dom.pills.appendChild(createPill(cat, cat)));
  if (dom.statCategories) dom.statCategories.textContent = categories.length;
}

function createPill(category, label) {
  const btn = document.createElement('button');
  btn.className = 'pill' + (category === activeCategory ? ' pill--active' : '');
  btn.dataset.category = category;
  btn.textContent = label;
  btn.setAttribute('role', 'tab');
  btn.setAttribute('tabindex', '0');
  btn.setAttribute('aria-selected', category === activeCategory);
  btn.addEventListener('click', () => {
    activeCategory = category;
    document.querySelectorAll('.pill').forEach(p => {
      p.classList.toggle('pill--active', p === btn);
      p.setAttribute('aria-selected', p === btn);
    });
    applyFilters();
  });
  return btn;
}

function showSkeletons(count = 12) {
  dom.grid.innerHTML = Array.from({ length: count }, () => '<div class="skeleton-card"></div>').join('');
}

function showGridError(msg) {
  dom.grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted)">${escapeHtml(msg)}</div>`;
}

function updateStats() {
  if (dom.statTotal) dom.statTotal.textContent = allChannels.length;
}

function openPlayer(channel) {
  if (!channel.url && !channel.proxy) return;
  currentChannel = channel;
  dom.playerTitle.textContent    = channel.name;
  dom.playerCategory.textContent = channel.category;
  dom.overlay.hidden      = false;
  dom.playerLoading.style.display = 'flex';
  dom.playerError.hidden  = true;
  document.body.style.overflow = 'hidden';
  
  // Si la URL principal es un scrape, usamos el proxy directamente
  const targetUrl = (channel.url && channel.url.startsWith('scrape:')) ? channel.proxy : channel.url;
  loadStream(targetUrl);
}

function loadStream(url) {
  destroyHls();
  const video = dom.video;
  video.src = '';
  
  // Mostrar error si requiere backend PHP y estamos en Expo (offline)
  if (url && url.startsWith('scrape:')) {
      dom.playerLoading.style.display = 'none';
      dom.playerError.hidden = false;
      dom.playerErrorMsg.textContent = "Este canal requiere tu servidor PHP backend (scrape). Configura tu URL remota.";
      return;
  }

  // Si el canal tiene un proxy configurado (p. ej. iframe), lo manejamos
  if (currentChannel.proxy && currentChannel.proxy.startsWith('iframe:')) {
      renderIframe(currentChannel.proxy.replace('iframe:', ''));
      return;
  }

  if (Hls.isSupported()) {
    hlsInstance = new Hls();
    hlsInstance.loadSource(url);
    hlsInstance.attachMedia(video);
    
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      dom.playerLoading.style.display = 'none';
      video.play().catch(() => { video.muted = true; video.play(); });
    });
    
    hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error("Network error encountered", data);
            dom.playerLoading.style.display = 'none';
            dom.playerError.hidden = false;
            dom.playerErrorMsg.textContent = "Error de red: El stream está caído o bloqueado (CORS).";
            hlsInstance.destroy();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error("Media error encountered", data);
            hlsInstance.recoverMediaError();
            break;
          default:
            hlsInstance.destroy();
            dom.playerLoading.style.display = 'none';
            dom.playerError.hidden = false;
            dom.playerErrorMsg.textContent = "Error desconocido al reproducir.";
            break;
        }
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    video.play().catch(e => {
        dom.playerLoading.style.display = 'none';
        dom.playerError.hidden = false;
        dom.playerErrorMsg.textContent = "Error de reproducción nativa.";
    });
    dom.playerLoading.style.display = 'none';
  } else {
    dom.playerLoading.style.display = 'none';
    dom.playerError.hidden = false;
    dom.playerErrorMsg.textContent = "Tu dispositivo no soporta este formato de video.";
  }
}

function renderIframe(src) {
    const container = $('iframe-container');
    container.innerHTML = `<iframe src="${src}" style="width:100%;height:100%;border:none;" allowfullscreen sandbox="allow-scripts allow-same-origin"></iframe>`;
    container.style.display = 'block';
    dom.video.style.display = 'none';
    dom.playerLoading.style.display = 'none';
}

function closePlayer() {
  destroyHls();
  dom.video.pause();
  dom.overlay.hidden = true;
  document.body.style.overflow = '';
  if (window.sendToExpo) window.sendToExpo('requestPortrait');
}

function destroyHls() {
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
}

function debounce(fn, delay) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));
}

function animateNumber(el, target) {
  el.textContent = target; // Simplificado para Expo
}
