window.ALARAB_BROCHURES={"guide":{"title":"باقات الضيافة في قصر العرب","src":"assets/services-guide.png"},"menu":{"title":"قائمة بوفيه قصر العرب — ١٠٠ شخص","src":"assets/buffet-menu.png"},"original":{"title":"الضيافة والتنسيق في قصر العرب","src":"assets/services-original.png"}};
(function () {
  'use strict';
  if (window.__alarabSiteAppInitialized) return;
  window.__alarabSiteAppInitialized = true;

  var pageNames = { home: 'الرئيسية', men: 'قسم الرجال', women: 'قسم النساء', packages: 'الباقات', info: 'معلومات القصر' };
  var galleryFilters = ['all', 'hall', 'stage', 'details', 'hospitality', 'dining'];
  var packageFilters = ['all', 'men', 'women'];
  var modalRecords = new Map();
  var state = { offline: false, page: '', route: '', gallery: { filter: 'all', limit: 6, items: [], viewer: [], index: 0 }, audience: 'all', touch: null };

  function one(selector, scope) { return (scope || document).querySelector(selector); }
  function all(selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); }
  function root() { return one('#page-root') || document; }
  function string(value) { return typeof value === 'string' ? value.trim() : ''; }
  function pageKey(value) { return Object.prototype.hasOwnProperty.call(pageNames, value) ? value : ''; }
  function audience(value) { return packageFilters.indexOf(value) !== -1 ? value : 'all'; }
  function number(value) { try { return new Intl.NumberFormat('ar-SA').format(value); } catch (_) { return String(value); } }
  function offlineData() { return window.ALARAB_OFFLINE && typeof window.ALARAB_OFFLINE === 'object' ? window.ALARAB_OFFLINE : null; }
  function resolveAsset(value) {
    var path = string(value), data = offlineData();
    if (!state.offline || !data || !data.assets) return path;
    var key = path.replace(/^\.\//, '');
    return string(data.assets[path]) || string(data.assets[key]) || path;
  }
  function hydrateAssets(scope) {
    if (!state.offline) return;
    all('img[data-asset]', scope).forEach(function (image) {
      var src = resolveAsset(image.getAttribute('data-asset'));
      if (src && image.getAttribute('src') !== src) image.setAttribute('src', src);
    });
  }
  function focusElement(element) {
    if (!element) return;
    requestAnimationFrame(function () {
      if (!element.isConnected || element.closest('[hidden]') || !element.getClientRects().length) return;
      try { element.focus({ preventScroll: true }); } catch (_) { element.focus(); }
    });
  }
  function scrollToTop() {
    var html = document.documentElement, previous = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (_) { window.scrollTo(0, 0); }
    html.style.scrollBehavior = previous;
  }

  function routeFor(key, section) { return '#/' + key + (key === 'packages' && section !== 'all' ? '/' + section : ''); }
  function readRoute() {
    if (location.hash.indexOf('#/') !== 0) return null;
    var parts;
    try { parts = decodeURIComponent(location.hash.slice(2)).split('/').filter(Boolean); } catch (_) { return null; }
    var key = pageKey(parts[0]);
    if (!key) return null;
    return { page: key, audience: key === 'packages' ? audience(parts[1]) : 'all' };
  }
  function queryAudience(url) {
    try { return audience(new URL(url || location.href, location.href).searchParams.get('section')); } catch (_) { return 'all'; }
  }
  function linkAudience(link) {
    var explicit = string(link.getAttribute('data-audience'));
    return explicit ? audience(explicit) : queryAudience(link.__alarabOriginalHref || link.getAttribute('href'));
  }
  function preparePageLinks() {
    all('a[data-page]').forEach(function (link) {
      var key = pageKey(link.getAttribute('data-page'));
      if (!key) return;
      if (!link.__alarabOriginalHref) link.__alarabOriginalHref = link.getAttribute('href') || '';
      var section = key === 'packages' ? linkAudience(link) : 'all';
      if (state.offline) link.setAttribute('href', routeFor(key, section));
      else if (key === 'packages' && section !== 'all') {
        try {
          var url = new URL(link.__alarabOriginalHref, location.href);
          if (url.searchParams.get('section') !== section) {
            url.searchParams.set('section', section);
            link.setAttribute('href', url.href);
          }
        } catch (_) { /* Preserve the authored link if it cannot be parsed. */ }
      }
    });
  }
  function updateNavigation() {
    document.body.setAttribute('data-page', state.page);
    all('a[data-page]').forEach(function (link) {
      var active = link.getAttribute('data-page') === state.page;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    all('[data-current-page]').forEach(function (label) { label.textContent = pageNames[state.page] || ''; });
  }

  function syncModalLock() {
    document.documentElement.classList.toggle('modal-open', !!one('#photo-dialog[open], #brochure-dialog[open]'));
  }
  function finishModalClose(dialog) {
    var record = modalRecords.get(dialog);
    modalRecords.delete(dialog);
    state.touch = null;
    syncModalLock();
    if (record && record.restore !== false) focusElement(record.opener);
  }
  function closeModal(dialog, restore) {
    if (!dialog) return;
    var record = modalRecords.get(dialog);
    if (record && restore === false) record.restore = false;
    try {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    } catch (_) { dialog.removeAttribute('open'); }
    finishModalClose(dialog);
  }
  function closeOwnedDialogs() {
    all('#photo-dialog[open], #brochure-dialog[open]').forEach(function (dialog) { closeModal(dialog, false); });
    modalRecords.clear();
    syncModalLock();
  }
  function openModal(dialog, opener, closeSelector) {
    if (!dialog || !dialog.isConnected) return;
    all('#photo-dialog[open], #brochure-dialog[open]').forEach(function (other) { if (other !== dialog) closeModal(other, false); });
    modalRecords.set(dialog, { opener: opener || document.activeElement, restore: true });
    try {
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      }
    } catch (_) { dialog.setAttribute('open', ''); }
    syncModalLock();
    focusElement(one(closeSelector, dialog));
  }
  function topModal() {
    var dialogs = Array.from(modalRecords.keys()).filter(function (dialog) { return dialog.open; });
    return dialogs[dialogs.length - 1] || one('#photo-dialog[open], #brochure-dialog[open]');
  }

  function matchesGallery(item, filter) {
    return filter === 'all' || string(item.getAttribute('data-category')).split(/[\s,]+/).indexOf(filter) !== -1;
  }
  function matchingGalleryItems() {
    return state.gallery.items.filter(function (item) { return matchesGallery(item, state.gallery.filter); });
  }
  function updateGallery() {
    var matches = matchingGalleryItems();
    state.gallery.items.forEach(function (item) { item.hidden = matches.indexOf(item) === -1 || matches.indexOf(item) >= state.gallery.limit; });
    all('[data-gallery-filter]', root()).forEach(function (button) {
      var selected = button.getAttribute('data-gallery-filter') === state.gallery.filter;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-active', selected);
    });
    all('[data-gallery-more]', root()).forEach(function (button) { button.hidden = matches.length <= state.gallery.limit; });
    all('[data-gallery-count]', root()).forEach(function (label) { label.textContent = number(matches.length) + ' صورة'; });
  }
  function setGalleryFilter(filter) {
    if (galleryFilters.indexOf(filter) === -1) return;
    state.gallery.filter = filter;
    state.gallery.limit = 6;
    updateGallery();
  }
  function initializeGallery() {
    state.gallery = { filter: 'all', limit: 6, items: all('[data-gallery-item][data-photo-id]', root()), viewer: [], index: 0 };
    updateGallery();
  }
  function showPhoto(index) {
    var gallery = state.gallery, count = gallery.viewer.length;
    if (!count) return;
    gallery.index = (index + count) % count;
    var item = gallery.viewer[gallery.index], image = one('#photo-viewer-img'), thumbnail = one('img', item);
    var src = string(item.getAttribute('data-full')) || (thumbnail && (thumbnail.getAttribute('data-asset') || thumbnail.getAttribute('src'))) || '';
    var title = string(item.getAttribute('data-title')) || (thumbnail && thumbnail.getAttribute('alt')) || 'صور القاعة';
    if (image) { image.src = resolveAsset(src); image.alt = title; }
    if (one('#photo-viewer-title')) one('#photo-viewer-title').textContent = title;
    if (one('#photo-viewer-caption')) {
      one('#photo-viewer-caption').textContent = string(item.getAttribute('data-caption'));
      one('#photo-viewer-caption').hidden = !string(item.getAttribute('data-caption'));
    }
    if (one('#photo-viewer-count')) one('#photo-viewer-count').textContent = number(gallery.index + 1) + ' / ' + number(count);
    all('[data-photo-prev], [data-photo-next]', one('#photo-dialog') || document).forEach(function (button) { button.hidden = count < 2; button.disabled = count < 2; });
  }
  function openPhoto(id, opener) {
    var item = state.gallery.items.find(function (candidate) { return candidate.getAttribute('data-photo-id') === String(id); });
    if (!item) return;
    if (!matchesGallery(item, state.gallery.filter)) setGalleryFilter('all');
    state.gallery.viewer = matchingGalleryItems();
    showPhoto(state.gallery.viewer.indexOf(item));
    openModal(one('#photo-dialog'), opener, '[data-photo-close]');
  }
  function moreGallery() {
    var matches = matchingGalleryItems(), firstNew = matches[state.gallery.limit];
    state.gallery.limit += 6;
    updateGallery();
    focusElement(firstNew);
  }

  function applyPackageFilter(filter) {
    state.audience = audience(filter);
    all('.package-card[data-audience]', root()).forEach(function (card) {
      var sections = string(card.getAttribute('data-audience')).split(/[\s,]+/);
      card.hidden = state.audience !== 'all' && sections.indexOf(state.audience) === -1 && sections.indexOf('all') === -1;
    });
    all('[data-package-filter]', root()).forEach(function (button) {
      var selected = button.getAttribute('data-package-filter') === state.audience;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-active', selected);
    });
  }
  function setPackageFilter(filter) {
    if (packageFilters.indexOf(filter) === -1) return;
    applyPackageFilter(filter);
    if (state.offline) {
      var route = routeFor('packages', state.audience);
      if (location.hash !== route) history.pushState(null, '', route);
      state.route = route;
    } else {
      try {
        var url = new URL(location.href);
        if (state.audience === 'all') url.searchParams.delete('section');
        else url.searchParams.set('section', state.audience);
        history.replaceState(null, '', url.href);
      } catch (_) { /* Filtering still works if URL updates are unavailable. */ }
    }
  }
  function openBrochure(key, opener) {
    var brochures = window.ALARAB_BROCHURES || {}, brochure = brochures[key];
    if (!brochure || !string(brochure.src)) return;
    var image = one('#brochure-image'), title = one('#brochure-title');
    if (image) { image.src = resolveAsset(brochure.src); image.alt = string(brochure.title); }
    if (title) title.textContent = string(brochure.title);
    var dialog = one('#brochure-dialog');
    openModal(dialog, opener, '#close-brochure');
    if (dialog) dialog.scrollTop = 0;
  }

  function initializePage(section) {
    hydrateAssets(document);
    preparePageLinks();
    initializeGallery();
    applyPackageFilter(section || 'all');
    updateNavigation();
  }
  function renderOfflinePage(key, section) {
    var data = offlineData(), target = one('#page-root'), page = data && data.pages && data.pages[key];
    if (!target || !page || typeof page.body !== 'string') return false;
    closeOwnedDialogs();
    target.innerHTML = page.body;
    state.page = key;
    if (string(page.title)) document.title = page.title;
    state.route = routeFor(key, section);
    initializePage(section);
    scrollToTop();
    return true;
  }
  function navigateOffline(key, section) {
    var data = offlineData();
    if (!data || !data.pages || !data.pages[key]) return;
    section = key === 'packages' ? audience(section) : 'all';
    var route = routeFor(key, section);
    if (location.hash !== route) history.pushState(null, '', route);
    renderOfflinePage(key, section);
  }
  function handleLocation() {
    if (!state.offline) return;
    var route = readRoute();
    if (route && routeFor(route.page, route.audience) !== state.route) renderOfflinePage(route.page, route.audience);
  }

  function onClick(event) {
    var target = event.target instanceof Element ? event.target : event.target.parentElement;
    if (!target) return;
    var link = target.closest('a[data-page]');
    if (link && state.offline && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !link.hasAttribute('download') && (!link.target || link.target === '_self')) {
      var key = pageKey(link.getAttribute('data-page'));
      if (key) { event.preventDefault(); navigateOffline(key, key === 'packages' ? linkAudience(link) : 'all'); return; }
    }
    var sectionLink = target.closest('a[href^="#"]');
    if (state.offline && sectionLink && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      var fragment = sectionLink.getAttribute('href');
      if (fragment && fragment.indexOf('#/') !== 0) {
        var sectionId;
        try { sectionId = decodeURIComponent(fragment.slice(1)); } catch (_) { sectionId = ''; }
        var section = sectionId && document.getElementById(sectionId);
        if (section) {
          event.preventDefault();
          section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
          if (sectionLink.classList.contains('skip-link')) focusElement(section);
          return;
        }
      }
    }
    var button = target.closest('[data-gallery-filter]');
    if (button) { event.preventDefault(); setGalleryFilter(button.getAttribute('data-gallery-filter')); return; }
    button = target.closest('[data-gallery-more]');
    if (button) { event.preventDefault(); moreGallery(); return; }
    button = target.closest('[data-gallery-open]');
    if (button) { event.preventDefault(); openPhoto(button.getAttribute('data-gallery-open'), button); return; }
    button = target.closest('[data-gallery-item][data-photo-id]');
    if (button) { event.preventDefault(); openPhoto(button.getAttribute('data-photo-id'), button); return; }
    button = target.closest('[data-photo-close]');
    if (button) { event.preventDefault(); closeModal(button.closest('dialog') || one('#photo-dialog')); return; }
    button = target.closest('[data-photo-prev], [data-photo-next]');
    if (button) { event.preventDefault(); showPhoto(state.gallery.index + (button.hasAttribute('data-photo-next') ? 1 : -1)); return; }
    button = target.closest('[data-package-filter]');
    if (button) { event.preventDefault(); setPackageFilter(button.getAttribute('data-package-filter')); return; }
    button = target.closest('[data-brochure]');
    if (button) { event.preventDefault(); openBrochure(button.getAttribute('data-brochure'), button); return; }
    button = target.closest('#close-brochure');
    if (button) { event.preventDefault(); closeModal(one('#brochure-dialog')); return; }
    if (target.tagName === 'DIALOG' && (target.id === 'photo-dialog' || target.id === 'brochure-dialog')) {
      var rect = target.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal(target);
    }
  }
  function onKeydown(event) {
    var dialog = topModal();
    if (!dialog) return;
    if (event.key === 'Escape') { event.preventDefault(); closeModal(dialog); return; }
    if (dialog.id !== 'photo-dialog' || event.altKey || event.ctrlKey || event.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(state.gallery.index + 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(state.gallery.index - 1); }
  }
  function onTouchStart(event) {
    var dialog = one('#photo-dialog');
    if (!dialog || !dialog.open || !dialog.contains(event.target) || event.touches.length !== 1 || event.target.closest('button, a')) { state.touch = null; return; }
    state.touch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }
  function onTouchEnd(event) {
    var start = state.touch, touch = event.changedTouches[0];
    state.touch = null;
    if (!start || !touch || !one('#photo-dialog[open]')) return;
    var dx = touch.clientX - start.x, dy = touch.clientY - start.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) showPhoto(state.gallery.index + (dx > 0 ? 1 : -1));
  }
  function initialize() {
    var data = offlineData();
    state.offline = !!(data && data.pages);
    state.page = pageKey(document.body.getAttribute('data-page')) || 'home';
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', function () { state.touch = null; }, { passive: true });
    document.addEventListener('close', function (event) {
      if (!event.target.open && (event.target.id === 'photo-dialog' || event.target.id === 'brochure-dialog')) finishModalClose(event.target);
    }, true);
    window.addEventListener('popstate', handleLocation);
    window.addEventListener('hashchange', handleLocation);
    if (state.offline) {
      try { history.scrollRestoration = 'manual'; } catch (_) { /* Optional browser support. */ }
      var route = readRoute() || { page: state.page, audience: state.page === 'packages' ? queryAudience() : 'all' };
      if (renderOfflinePage(route.page, route.audience)) {
        if (location.hash.indexOf('#/') !== 0) history.replaceState(null, '', state.route);
        return;
      }
    }
    initializePage(state.page === 'packages' ? queryAudience() : 'all');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
}());
