import { MONTHS, addDays, civil, breaks, dayOfWeek, escapeHtml as e, formatDate, hijri, jakartaToday, pasaran, pathFor, type Lang, type YearData } from '../core.ts';
import { eventQualifiers, statusLabel, words } from '../i18n.ts';

const body = document.body;
const lang = (body.dataset.lang === 'en' ? 'en' : 'id') as Lang;
const t = words[lang];
const shownYear = Number(body.dataset.year);
const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => root.querySelector<T & Element>(selector) as T | null;
const yearCache = new Map<number, Promise<YearData>>();

function loadYear(year: number): Promise<YearData> {
  if (!yearCache.has(year)) {
    yearCache.set(year, fetch(`/data/${year}.json`).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<YearData>;
    }).catch((error) => { yearCache.delete(year); throw error; }));
  }
  return yearCache.get(year)!;
}

let toastTimer: number | undefined;
function toast(message: string): void {
  const node = $('.toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => node.classList.remove('visible'), 2400);
}

const WEEKDAY_LONG = { id: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };

/** Shared date detail markup for the dialog and the date tool. */
async function dateDetails(date: string): Promise<string> {
  const weekday = WEEKDAY_LONG.id[dayOfWeek(date)];
  const rows: [string, string][] = [
    [t.date, formatDate(date, lang, true)],
    [lang === 'id' ? 'Weton' : 'Weton (Javanese)', `${weekday} ${pasaran(date)}`],
    [lang === 'id' ? 'Hijriah (tabular)' : 'Hijri (tabular)', hijri(date, lang)],
  ];
  let events = '';
  try {
    const data = await loadYear(Number(date.slice(0, 4)));
    const matches = data.holidays.filter((h) => h.date === date);
    events = matches.length
      ? `<ul class="detail-events">${matches.map((h) => {
          const source = data.sources.find((s) => s.id === h.sourceId);
          return `<li class="${h.type}"><strong>${e(lang === 'en' ? h.nameEn : h.name)}</strong><span>${[h.type === 'national' ? t.national : t.leave, statusLabel(h.status, lang), ...eventQualifiers(h, lang)].map(e).join(' · ')}</span>${source ? `<a href="${e(source.url)}" rel="noopener">${t.source}</a>` : ''}</li>`;
        }).join('')}</ul>`
      : `<p class="quiet">${data.status === 'unverified' ? e(data.note[lang]) : lang === 'id' ? 'Tidak ada libur nasional atau cuti bersama tercatat.' : 'No national holiday or collective leave listed.'}</p>`;
  } catch {
    events = `<p class="quiet">${t.error}</p>`;
  }
  return `<dl class="detail-list">${rows.map(([k, v]) => `<div><dt>${e(k)}</dt><dd>${e(v)}</dd></div>`).join('')}</dl>${events}`;
}

function setupDialog(): void {
  const dialog = $<HTMLDialogElement>('#date-dialog');
  const content = $('#dialog-content');
  if (!dialog || !content) return;
  let opener: HTMLElement | null = null;
  let current = '';
  const open = async (date: string) => {
    current = date;
    content.innerHTML = `<h2 id="dialog-title">${e(formatDate(date, lang, true))}</h2><p class="quiet">…</p>`;
    if (!dialog.open) dialog.showModal();
    history.replaceState(null, '', `#${date}`);
    const details = await dateDetails(date);
    if (current === date) content.innerHTML = `<h2 id="dialog-title">${e(formatDate(date, lang, true))}</h2>${details}`;
  };
  document.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-date]');
    if (!target || target.closest('#date-dialog')) return;
    opener = target;
    void open(target.dataset.date!);
  });
  $('#dialog-close')?.addEventListener('click', () => dialog.close());
  $('#dialog-share')?.addEventListener('click', async () => {
    const url = `${location.origin}${pathFor(Number(current.slice(0, 4)), lang, body.dataset.embed === 'true' ? undefined : Number(current.slice(5, 7)))}#${current}`;
    try { await navigator.clipboard.writeText(url); toast(t.copied); } catch { toast(url); }
  });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    history.replaceState(null, '', location.pathname + location.search);
    opener?.focus();
  });
  const hash = location.hash.slice(1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(hash)) {
    try { civil(hash); opener = document.querySelector<HTMLElement>(`.day[data-date="${hash}"]`); void open(hash); } catch { /* invalid or out-of-range date in the URL: ignore */ }
  }
}

function setupToday(): void {
  const today = jakartaToday();
  document.querySelectorAll(`.day[data-date="${today}"]`).forEach((node) => {
    node.classList.add('today');
    node.setAttribute('aria-current', 'date');
    // Today becomes its month's tab stop instead of day 1.
    node.closest('.days')?.querySelector('[tabindex="0"]')?.setAttribute('tabindex', '-1');
    node.setAttribute('tabindex', '0');
  });
  const day = $('[data-today-day]'), month = $('[data-today-month]');
  if (day) day.textContent = String(Number(today.slice(8)));
  if (month) month.textContent = `${WEEKDAY_LONG[lang][dayOfWeek(today)]}, ${MONTHS[lang][Number(today.slice(5, 7)) - 1]} ${today.slice(0, 4)}`;
  $('[data-today]')?.addEventListener('click', () => {
    const node = $(`.day[data-date="${today}"]`);
    if (node) { node.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); node.focus({ preventScroll: true }); }
    else location.href = pathFor(Number(today.slice(0, 4)), lang, Number(today.slice(5, 7)));
  });
}

async function setupNextHoliday(): Promise<void> {
  const node = $('#next-holiday');
  if (!node) return;
  const today = jakartaToday();
  try {
    const data = await loadYear(shownYear);
    const national = data.holidays.filter((h) => h.type === 'national');
    const upcoming = Number(today.slice(0, 4)) === shownYear ? national.find((h) => h.date >= today) : national[0];
    if (!upcoming) { node.innerHTML = `<p class="quiet">${national.length ? t.noNext : e(data.note[lang])}</p>`; return; }
    const days = Math.round((Date.parse(upcoming.date) - Date.parse(today)) / 86400000);
    const when = Number(today.slice(0, 4)) !== shownYear ? '' : days === 0 ? t.today : lang === 'id' ? `${days} hari lagi` : `in ${days} day${days === 1 ? '' : 's'}`;
    node.innerHTML = `<button class="next-card" data-date="${upcoming.date}"><strong>${e(lang === 'en' ? upcoming.nameEn : upcoming.name)}</strong><span>${e(formatDate(upcoming.date, lang, true))}</span>${when ? `<span class="quiet">${when}</span>` : ''}${eventQualifiers(upcoming, lang).map((q) => `<small class="estimate-label">${e(q)}</small>`).join('')}</button>`;
  } catch { node.innerHTML = `<p class="quiet">${t.error}</p>`; }
}

function setupHolidayFilter(): void {
  const search = $<HTMLInputElement>('#holiday-search'), type = $<HTMLSelectElement>('#holiday-type');
  if (!search || !type) return;
  const empty = $<HTMLElement>('.empty-message');
  const apply = () => {
    const query = search.value.trim().toLocaleLowerCase(lang);
    let visible = 0;
    document.querySelectorAll<HTMLTableRowElement>('tr[data-holiday-type]').forEach((row) => {
      const show = (type.value === 'all' || row.dataset.holidayType === type.value) && (!query || row.textContent!.toLocaleLowerCase(lang).includes(query));
      row.hidden = !show;
      if (show) visible++;
    });
    if (empty) { empty.hidden = visible > 0; if (!visible) empty.textContent = t.nothing; }
  };
  search.addEventListener('input', apply);
  type.addEventListener('change', apply);
}

function setupTools(): void {
  const workForm = $<HTMLFormElement>('#work-form'), workResult = $('#work-result');
  workForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(workForm);
    const query = new URLSearchParams({ start: String(form.get('start')), end: String(form.get('end')), includeLeave: String(form.has('leave')), saturdayWorking: String(form.has('saturday')) });
    try {
      const response = await fetch(`/api/v1/workdays?${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? t.error);
      const caveat = data.official ? '' : `<p class="quiet">${lang === 'id' ? 'Sebagian tahun belum punya data libur resmi; hasil ini bukan hitungan resmi.' : 'Some years lack official holiday data; this is not an official count.'}</p>`;
      workResult!.innerHTML = `<p class="result-number"><strong>${data.working}</strong> ${lang === 'id' ? 'hari kerja' : 'working days'}</p><p>${data.total} ${t.days} · ${data.weekends} ${lang === 'id' ? 'akhir pekan' : 'weekend days'} · ${data.excludedHolidays} ${lang === 'id' ? 'libur di hari kerja' : 'holidays on workdays'}</p>${caveat}`;
    } catch (error) { workResult!.innerHTML = `<p class="error">${e((error as Error).message)}</p>`; }
  });

  const breakForm = $<HTMLFormElement>('#break-form'), breakResult = $('#break-result');
  breakForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(breakForm);
    try {
      const data = await loadYear(Number(form.get('year')));
      const found = breaks(data.year, data.holidays, Number(form.get('budget')), form.has('leave'));
      const caveat = data.status === 'official' ? '' : `<p class="quiet">${e(data.note[lang])}</p>`;
      breakResult!.innerHTML = found.length
        ? `<ol class="break-list">${found.map((b) => `<li><strong>${b.days} ${t.days}</strong><span>${e(formatDate(b.start, lang))} – ${e(formatDate(b.end, lang))}</span><span class="quiet">${b.leave.length ? `${lang === 'id' ? 'Ambil cuti' : 'Take leave'}: ${b.leave.map((d) => e(formatDate(d, lang))).join(', ')}` : lang === 'id' ? 'Tanpa cuti tambahan' : 'No extra leave'}</span></li>`).join('')}</ol>${caveat}`
        : `<p>${lang === 'id' ? 'Tidak ditemukan jeda tiga hari atau lebih.' : 'No break of three days or more found.'}</p>${caveat}`;
    } catch { breakResult!.innerHTML = `<p class="error">${t.error}</p>`; }
  });

  const dateForm = $<HTMLFormElement>('#date-form'), dateResult = $('#date-result');
  dateForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const date = String(new FormData(dateForm).get('date'));
    try { dateResult!.innerHTML = await dateDetails(date); } catch { dateResult!.innerHTML = `<p class="error">${t.error}</p>`; }
  });
}

function setupDateCalculator(): void {
  const diffForm = $<HTMLFormElement>('#diff-form'), diffResult = $('#diff-result');
  diffForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(diffForm);
    try {
      const start = civil(String(form.get('start'))).valueOf(), end = civil(String(form.get('end'))).valueOf();
      const days = Math.round((end - start) / 86400000), abs = Math.abs(days);
      const weeks = `${Math.floor(abs / 7)} ${lang === 'id' ? 'minggu' : 'weeks'} ${abs % 7} ${t.days}`;
      diffResult!.innerHTML = `<p class="result-number"><strong>${days.toLocaleString(lang)}</strong> ${t.days}</p><p class="quiet">${weeks}. ${lang === 'id' ? 'Jika kedua tanggal dihitung: ' : 'Counting both dates: '}${(abs + 1).toLocaleString(lang)} ${t.days}.</p>`;
    } catch { diffResult!.innerHTML = `<p class="error">${lang === 'id' ? 'Tanggal harus antara 1900 dan 2100.' : 'Dates must be between 1900 and 2100.'}</p>`; }
  });
  const addForm = $<HTMLFormElement>('#add-form'), addResult = $('#add-result');
  addForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(addForm);
    try {
      const date = addDays(String(form.get('start')), Number(form.get('days')));
      addResult!.innerHTML = `<p class="result-number"><button class="link-button" data-date="${date}">${e(formatDate(date, lang, true))}</button></p>${await dateDetails(date)}`;
    } catch { addResult!.innerHTML = `<p class="error">${lang === 'id' ? 'Hasil di luar rentang 1900-2100.' : 'Result is outside 1900-2100.'}</p>`; }
  });
}

function setupEmbedBuilder(): void {
  const form = $<HTMLFormElement>('#embed-form'), preview = $<HTMLIFrameElement>('#embed-preview'), code = $<HTMLTextAreaElement>('#embed-code');
  if (!form || !preview || !code) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const query = new URLSearchParams({ year: String(data.get('year')), lang: String(data.get('lang')) });
    if (data.get('theme') !== 'auto') query.set('theme', String(data.get('theme')));
    preview.src = `/embed?${query}`;
    code.value = code.value.replace(/\/embed\?[^"]*/, `/embed?${query}`);
  });
  $('#copy-embed')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(code.value); toast(t.copied); }
    catch { code.select(); toast(lang === 'id' ? 'Tekan Ctrl+C untuk menyalin' : 'Press Ctrl+C to copy'); }
  });
}

function setupEmbedNavigation(): void {
  if (body.dataset.embed !== 'true') return;
  const params = new URLSearchParams(location.search);
  const go = (year: number, month: number) => {
    if (year < 1900 || year > 2100) return;
    params.set('year', String(year));
    params.set('month', String(month));
    params.set('lang', lang);
    location.search = params.toString();
  };
  const month = Number(body.dataset.month) || 1;
  document.querySelectorAll<HTMLButtonElement>('[data-embed-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = month + Number(button.dataset.embedStep);
      go(shownYear + Math.floor((next - 1) / 12), ((next - 1 + 12) % 12) + 1);
    });
  });
  $<HTMLSelectElement>('#embed-month')?.addEventListener('change', (event) => go(shownYear, Number((event.target as HTMLSelectElement).value)));
}

function setupTheme(): void {
  const button = $('#theme-toggle');
  button?.addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch { /* storage unavailable: theme lasts for this page only */ }
  });
}

/** Calendar grid keys: arrows move by day/week, Home/End to week start/end; roving tabindex keeps one tab stop per month. */
function setupGridKeys(): void {
  document.addEventListener('keydown', (event) => {
    const current = (event.target as Element).closest<HTMLElement>('.day[data-date]');
    if (!current) return;
    const date = current.dataset.date!;
    const weekday = (dayOfWeek(date) + 6) % 7; // Monday = 0
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday }[event.key];
    if (step === undefined) return;
    let target: string;
    try { target = addDays(date, step); } catch { return; }
    const next = document.querySelector<HTMLElement>(`.day[data-date="${target}"]`);
    if (!next) return;
    event.preventDefault();
    current.setAttribute('tabindex', '-1');
    next.closest('.days')?.querySelector('[tabindex="0"]')?.setAttribute('tabindex', '-1');
    next.setAttribute('tabindex', '0');
    next.focus();
  });
}

setupTheme();
setupToday();
setupDialog();
setupGridKeys();
setupHolidayFilter();
setupTools();
setupDateCalculator();
setupEmbedBuilder();
setupEmbedNavigation();
document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
void setupNextHoliday();
