import { MONTHS, addDays, civil, breaks, dayOfWeek, escapeHtml as e, formatDate, jakartaToday, pathFor, type Lang, type YearData } from '../core.ts';
import { describeDate } from '../calendars/index.ts';
import { formatChinese, toChinese, type ChineseDate } from '../calendars/chinese.ts';
import { HIJRI_MONTHS, toHijri } from '../calendars/islamic.ts';
import { toJavanese, weton } from '../calendars/javanese.ts';
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

/** Detail rows for every calendar system: [label, value, optional qualifier]. */
function calendarRows(date: string): [string, string, string?][] {
  const d = describeDate(date, lang);
  const { weton, kraton, aboge } = d.javanese;
  const jv = (x: typeof kraton) => `${x.day} ${x.monthName} ${x.year} ${x.yearName}`;
  const rows: [string, string, string?][] = [
    ['Weton', `${weton.weekday} ${weton.pasaran}`, `neptu ${weton.neptu.weekday} + ${weton.neptu.pasaran} = ${weton.neptu.total}`],
    [lang === 'id' ? 'Jawa' : 'Javanese', jv(kraton), [`${lang === 'id' ? 'kurup' : 'kurup'} ${kraton.kurup === 'asapon' ? 'Asapon' : 'Aboge'}`, kraton.projected ? (lang === 'id' ? 'proyeksi' : 'projected') : '', kraton.kurup === 'asapon' && jv(aboge) !== jv(kraton) ? `Aboge: ${jv(aboge)}` : ''].filter(Boolean).join(' · ')],
    [lang === 'id' ? 'Hijriah' : 'Hijri', d.islamic.civil.formatted, [lang === 'id' ? 'tabular, bukan keputusan isbat' : 'tabular, not an isbat decision', d.islamic.umalqura && d.islamic.umalqura.formatted !== d.islamic.civil.formatted ? `Umm al-Qura: ${d.islamic.umalqura.formatted}` : ''].filter(Boolean).join(' · ')],
  ];
  if (d.chinese) rows.push([lang === 'id' ? 'Tionghoa' : 'Chinese', formatChinese(d.chinese, lang), 'HKO']);
  return rows;
}

/** Shared date detail markup for the dialog and the date tool. */
async function dateDetails(date: string): Promise<string> {
  const rows = calendarRows(date);
  const observances = describeDate(date, lang).observances;
  const observed = observances.length
    ? `<p class="detail-observances"><span class="eyebrow">${lang === 'id' ? 'PERINGATAN (PERHITUNGAN, BUKAN LIBUR)' : 'OBSERVANCES (CALCULATED, NOT HOLIDAYS)'}</span>${observances.map((o) => `${e(lang === 'en' ? o.nameEn : o.name)}${o.uncertaintyDays ? ` <small class="estimate-label">±${o.uncertaintyDays} ${t.days}</small>` : ''}`).join('<br>')}</p>`
    : '';
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
  return `${events}<dl class="detail-list">${rows.map(([k, v, q]) => `<div><dt>${e(k)}</dt><dd>${e(v)}${q ? `<small>${e(q)}</small>` : ''}</dd></div>`).join('')}</dl>${observed}`;
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

type Mode = 'masehi' | 'hijriah' | 'tionghoa' | 'jawa';
const MODES: Mode[] = ['masehi', 'hijriah', 'tionghoa', 'jawa'];
const PASARAN_SHORT: Record<string, string> = { Legi: 'Lgi', Pahing: 'Phg', Pon: 'Pon', Wage: 'Wge', Kliwon: 'Kli' };

/** Secondary-calendar label for one day: [short label for small cells, full label]. */
function altLabel(date: string, mode: Mode): [string, string] | undefined {
  if (mode === 'hijriah') {
    const h = toHijri(date, 'civil');
    const month = HIJRI_MONTHS[lang][h.month - 1];
    return [h.day === 1 ? month.slice(0, 3) : String(h.day), `${h.day} ${month}`];
  }
  if (mode === 'tionghoa') {
    let c: ChineseDate | undefined;
    try { c = toChinese(date); } catch { return undefined; }
    const month = `${lang === 'id' ? 'Bln' : 'M'}${c.month}${c.leap ? '+' : ''}`;
    return [c.day === 1 ? month : String(c.day), `${c.day} · ${month}`];
  }
  if (mode === 'jawa') {
    const w = weton(date), j = toJavanese(date);
    return [PASARAN_SHORT[w.pasaran], `${w.pasaran} · ${j.day} ${j.monthName}`];
  }
  return undefined;
}

/** Month heading subtitle: the secondary-calendar months a Gregorian month spans. */
function altSpan(first: string, last: string, mode: Mode): string {
  if (mode === 'hijriah') {
    const a = toHijri(first, 'civil'), b = toHijri(last, 'civil');
    const name = (h: typeof a) => HIJRI_MONTHS[lang][h.month - 1];
    return a.year === b.year ? `${name(a)}–${name(b)} ${b.year} ${lang === 'id' ? 'H' : 'AH'}` : `${name(a)} ${a.year} – ${name(b)} ${b.year}`;
  }
  if (mode === 'tionghoa') {
    try {
      const a = toChinese(first), b = toChinese(last);
      return `${lang === 'id' ? 'Bulan' : 'Month'} ${a.month}${a.leap ? '+' : ''}–${b.month}${b.leap ? '+' : ''} · ${b.kongzili} Kongzili`;
    } catch { return lang === 'id' ? 'Di luar tabel HKO' : 'Outside the HKO table'; }
  }
  if (mode === 'jawa') {
    const a = toJavanese(first), b = toJavanese(last);
    return `${a.monthName}–${b.monthName} ${b.year} ${b.yearName}${b.projected ? (lang === 'id' ? ' (proyeksi)' : ' (projected)') : ''}`;
  }
  return '';
}

function setupCalendarMode(): void {
  const select = $<HTMLSelectElement>('#calendar-mode');
  const params = new URLSearchParams(location.search);
  let stored: string | null = null;
  try { stored = localStorage.getItem('calendar-mode'); } catch { /* storage unavailable */ }
  const initial = (params.get('mode') ?? stored ?? 'masehi') as Mode;
  const apply = (mode: Mode) => {
    if (!MODES.includes(mode)) mode = 'masehi';
    document.documentElement.dataset.mode = mode;
    document.querySelectorAll<HTMLElement>('.day[data-date]').forEach((day) => {
      const base = day.dataset.label ?? day.getAttribute('aria-label');
      if (base && day.dataset.label === undefined) day.dataset.label = base;
      const alt = altLabel(day.dataset.date!, mode);
      const large = !!day.closest('.month.large');
      if (alt) day.dataset.alt = large ? alt[1] : alt[0];
      else delete day.dataset.alt;
      if (base) day.setAttribute('aria-label', alt ? `${base}, ${alt[1]}` : base);
    });
    const notes: Record<Mode, string> = {
      masehi: '',
      hijriah: lang === 'id' ? 'Hijriah tabular (perhitungan). Tanggal resmi ditetapkan Kemenag melalui sidang isbat dan dapat berbeda ±1 hari.' : 'Tabular Hijri (calculated). Official dates are set by the Kemenag isbat and may differ by ±1 day.',
      tionghoa: lang === 'id' ? 'Kalender Tionghoa dari tabel Hong Kong Observatory; bulan kabisat ditandai +.' : 'Chinese calendar from Hong Kong Observatory tables; leap months are marked +.',
      jawa: lang === 'id' ? 'Pasaran dan tanggal Jawa (kurup Asapon). Hari Jawa berganti saat magrib; di sini memakai tengah malam.' : 'Pasaran and Javanese date (Asapon kurup). The Javanese day begins at sunset; this view uses midnight.',
    };
    let modeNote = $('.mode-note');
    if (notes[mode] && !modeNote && $('.calendar-meta')) { modeNote = document.createElement('p'); modeNote.className = 'mode-note'; $('.calendar-meta')!.after(modeNote); }
    if (modeNote) { modeNote.textContent = notes[mode]; modeNote.hidden = !notes[mode]; }
    document.querySelectorAll<HTMLElement>('.month').forEach((month) => {
      const days = month.querySelectorAll<HTMLElement>('.day[data-date]');
      let note = month.querySelector<HTMLElement>('.month-alt');
      if (mode === 'masehi' || !days.length) { note?.remove(); return; }
      if (!note) { note = document.createElement('p'); note.className = 'month-alt'; month.querySelector('.month-head')?.after(note); }
      note.textContent = altSpan(days[0].dataset.date!, days[days.length - 1].dataset.date!, mode);
    });
  };
  apply(initial);
  if (select) {
    select.value = MODES.includes(initial) ? initial : 'masehi';
    select.addEventListener('change', () => {
      const mode = select.value as Mode;
      apply(mode);
      try { localStorage.setItem('calendar-mode', mode); } catch { /* storage unavailable */ }
      const url = new URL(location.href);
      if (mode === 'masehi') url.searchParams.delete('mode');
      else url.searchParams.set('mode', mode);
      history.replaceState(null, '', url);
    });
  }
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
  // Report height to the embedding page (embed.js resizes the iframe). Only a number is shared.
  if (window.parent !== window) {
    // Content height, not scrollHeight: scrollHeight never drops below the iframe's own viewport, so frames could not shrink.
    const report = () => window.parent.postMessage({ type: 'kalender:height', height: Math.ceil(document.body.getBoundingClientRect().height) }, '*');
    new ResizeObserver(report).observe(document.body);
    report();
  }
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
setupCalendarMode();
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
