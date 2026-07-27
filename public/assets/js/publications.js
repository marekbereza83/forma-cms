'use strict';

/* ── Publikacje: filtr kategorii/roku, wyszukiwarka, sortowanie, widok, paginacja ─
   Layout: dwie kolumny (featured + sidebar, patrz forma-layout.css .pub-split) —
   applyFilters() liczy strone jak poprzednio, ale dodatkowo dzieli jej zawartosc
   na "featured" (pierwsze N) i "sidebar" (reszta), fizycznie przenoszac karty
   miedzy dwoma kontenerami (CSS sam w sobie nie umie przenosic wezlow DOM). */
const pubSplit = document.querySelector('[data-pub-split]');

if (pubSplit) {
  pubSplit.closest('.pub-list-page')?.classList.add('js-on');

  const featuredCol = document.querySelector('[data-pub-featured-col]');
  const sidebarCol  = document.querySelector('[data-pub-sidebar-col]');
  const cards       = Array.from(pubSplit.querySelectorAll('[data-pub-card]'));
  const pageSize      = parseInt(pubSplit.dataset.pubPageSize, 10) || 7;
  const featuredCount = parseInt(pubSplit.dataset.pubFeaturedCount, 10) || 3;
  const emptyMsg    = document.querySelector('[data-pub-empty]');
  const pagination  = document.querySelector('[data-pub-pagination]');
  const prevBtn     = document.querySelector('[data-pub-prev]');
  const nextBtn     = document.querySelector('[data-pub-next]');
  const pageStatus  = document.querySelector('[data-pub-page-status]');
  const searchInput = document.querySelector('[data-pub-search]');
  const sortBtn     = document.querySelector('[data-pub-sort]');
  const resetBtn    = document.querySelector('[data-pub-reset]');
  const featuredTotalEl = document.querySelector('[data-pub-featured-total]');
  const sidebarTotalEl  = document.querySelector('[data-pub-sidebar-total]');

  let category = 'WSZYSTKIE';
  let year     = 'WSZYSTKIE';
  let query    = '';
  let sortDesc = true;
  let page     = 1;

  function applyFilters() {
    const matches = cards.filter(card => {
      const matchesCategory = category === 'WSZYSTKIE' || card.dataset.category === category;
      const matchesYear     = year === 'WSZYSTKIE' || card.dataset.year === year;
      const matchesQuery    = query === '' || card.dataset.search.includes(query);
      return matchesCategory && matchesYear && matchesQuery;
    });

    matches.sort((a, b) => {
      const da = a.dataset.date || '';
      const db = b.dataset.date || '';
      return sortDesc ? db.localeCompare(da) : da.localeCompare(db);
    });

    const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
    page = Math.min(Math.max(1, page), totalPages);

    const pageItems = matches.slice((page - 1) * pageSize, page * pageSize);
    const pageItemSet = new Set(pageItems);

    // Karty spoza biezacej strony (odfiltrowane lub inna strona) — tylko ukryj,
    // pozycja w DOM bez znaczenia bo display:none nie zajmuje miejsca w gridzie.
    cards.forEach(card => {
      if (!pageItemSet.has(card)) card.classList.add('is-hidden');
    });

    // Karty na biezacej stronie — przenies do wlasciwej kolumny, w kolejnosci sortowania.
    pageItems.forEach((card, i) => {
      const isFeatured = i < featuredCount;
      card.classList.remove('is-hidden');
      card.classList.toggle('pub-card--featured', isFeatured);
      card.classList.toggle('pub-card--compact', !isFeatured);
      (isFeatured ? featuredCol : sidebarCol)?.appendChild(card);
    });

    if (featuredTotalEl) featuredTotalEl.textContent = String(Math.min(featuredCount, pageItems.length));
    if (sidebarTotalEl) sidebarTotalEl.textContent = String(Math.max(0, pageItems.length - featuredCount));

    if (emptyMsg) emptyMsg.hidden = matches.length > 0;
    if (pagination) pagination.hidden = matches.length === 0;
    if (pageStatus) pageStatus.textContent = `STRONA ${page} Z ${totalPages}`;
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;
  }

  document.querySelectorAll('[data-pub-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-pub-category]').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      category = btn.dataset.pubCategory;
      page = 1;
      applyFilters();
    });
  });

  document.querySelectorAll('[data-pub-year]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-pub-year]').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      year = btn.dataset.pubYear;
      page = 1;
      applyFilters();
    });
  });

  searchInput?.addEventListener('input', () => {
    query = searchInput.value.trim().toLowerCase();
    page = 1;
    applyFilters();
  });

  sortBtn?.addEventListener('click', () => {
    sortDesc = !sortDesc;
    sortBtn.textContent = sortDesc ? 'Najnowsze' : 'Najstarsze';
    applyFilters();
  });

  resetBtn?.addEventListener('click', () => {
    category = 'WSZYSTKIE';
    year = 'WSZYSTKIE';
    query = '';
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('[data-pub-category], [data-pub-year]').forEach(b => b.classList.remove('is-active'));
    document.querySelector('[data-pub-category="WSZYSTKIE"]')?.classList.add('is-active');
    document.querySelector('[data-pub-year="WSZYSTKIE"]')?.classList.add('is-active');
    page = 1;
    applyFilters();
  });

  prevBtn?.addEventListener('click', () => { if (page > 1) { page--; applyFilters(); } });
  nextBtn?.addEventListener('click', () => { page++; applyFilters(); });

  // [data-pub-view] tez opisuje aktualny widok samego kontenera .pub-split — pomijamy go tu.
  document.querySelectorAll('button[data-pub-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('button[data-pub-view]').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      pubSplit.dataset.pubView = btn.dataset.pubView;
    });
  });

  applyFilters();
}

/* ── Zakładki (localStorage, dziala na liscie i na stronie artykulu) ───────────── */
const PUB_BOOKMARKS_KEY = 'forma-publikacje-bookmarks';

function pubGetBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(PUB_BOOKMARKS_KEY) || '[]');
  } catch {
    return [];
  }
}

function pubSetBookmarks(ids) {
  try {
    localStorage.setItem(PUB_BOOKMARKS_KEY, JSON.stringify(ids));
  } catch {
    // localStorage niedostepny (tryb prywatny / limit) — zakladka po prostu nie przetrwa odswiezenia
  }
}

function pubPaintBookmark(btn, isBookmarked) {
  btn.classList.toggle('is-bookmarked', isBookmarked);
  btn.setAttribute('aria-pressed', String(isBookmarked));
}

const pubBookmarks = pubGetBookmarks();
document.querySelectorAll('[data-pub-bookmark]').forEach(btn => {
  const id = btn.dataset.pubBookmark;
  pubPaintBookmark(btn, pubBookmarks.includes(id));
  btn.addEventListener('click', () => {
    const current = pubGetBookmarks();
    const idx = current.indexOf(id);
    if (idx === -1) current.push(id); else current.splice(idx, 1);
    pubSetBookmarks(current);
    pubPaintBookmark(btn, current.includes(id));
  });
});

/* ── Kopiuj link (strona artykułu) ─────────────────────────────────────────────── */
const pubCopyBtn = document.querySelector('[data-pub-copy-link]');
if (pubCopyBtn) {
  const originalLabel = pubCopyBtn.textContent;
  pubCopyBtn.addEventListener('click', () => {
    const url = pubCopyBtn.dataset.url || window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      pubCopyBtn.classList.add('is-copied');
      pubCopyBtn.textContent = 'Skopiowano!';
      setTimeout(() => {
        pubCopyBtn.classList.remove('is-copied');
        pubCopyBtn.textContent = originalLabel;
      }, 2000);
    }).catch(() => {
      // Clipboard API niedostepne (np. brak uprawnien) — brak akcji, link i tak jest w pasku adresu
    });
  });
}
