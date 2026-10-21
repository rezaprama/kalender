import { AUTHOR, MAX_YEAR, MIN_YEAR, SITE } from '../src/core.ts';

const year = { name: 'year', in: 'query', required: true, schema: { type: 'integer', minimum: MIN_YEAR, maximum: MAX_YEAR } };
const error = { description: 'Invalid request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };

/** OpenAPI 3.1 description of the public API. Kept next to the build so it ships with every deploy. */
export function openapi() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Kalender Indonesia API',
      version: '1.0.0',
      description: 'Indonesian public holidays and collective leave with source provenance, 1900-2100. Only years backed by government decrees are marked official.',
      contact: { name: AUTHOR.name, url: AUTHOR.url },
      license: { name: 'Apache-2.0 (code), CC BY 4.0 (curated data)', identifier: 'Apache-2.0' },
    },
    servers: [{ url: SITE }],
    paths: {
      '/api/v1/holidays': {
        get: {
          summary: 'Holidays and collective leave for one year',
          parameters: [
            year,
            { name: 'month', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 12 } },
            { name: 'type', in: 'query', schema: { enum: ['national', 'leave'] } },
            { name: 'status', in: 'query', schema: { enum: ['official', 'estimated', 'unverified'] } },
            { name: 'lang', in: 'query', schema: { enum: ['id', 'en'], default: 'id' } },
            { name: 'format', in: 'query', schema: { enum: ['json', 'ics', 'csv'], default: 'json' } },
          ],
          responses: {
            200: { description: 'Holiday list', content: { 'application/json': { schema: { $ref: '#/components/schemas/HolidayResponse' } }, 'text/calendar': {}, 'text/csv': {} } },
            304: { description: 'Not modified (ETag match)' },
            400: error,
          },
        },
      },
      '/api/v1/workdays': {
        get: {
          summary: 'Count working days in an inclusive date range (max 3660 days)',
          parameters: [
            { name: 'start', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
            { name: 'end', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
            { name: 'includeLeave', in: 'query', schema: { type: 'boolean', default: false } },
            { name: 'saturdayWorking', in: 'query', schema: { type: 'boolean', default: false } },
          ],
          responses: { 200: { description: 'Working-day count with per-year data coverage' }, 400: error },
        },
      },
      // Calendar conversions are calculations; responses label method and supported range.
      ...calendarPaths(),
    },
    components: {
      schemas: {
        Error: { type: 'object', required: ['error'], properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
        Holiday: {
          type: 'object',
          required: ['date', 'name', 'nameEn', 'type', 'status', 'sourceId'],
          properties: {
            date: { type: 'string', format: 'date' }, name: { type: 'string' }, nameEn: { type: 'string' }, nameLocalized: { type: 'string' },
            type: { enum: ['national', 'leave'] }, status: { enum: ['official', 'estimated', 'unverified'] }, sourceId: { type: 'string' },
            uncertaintyDays: { type: 'integer', minimum: 1, description: 'Calculated date may shift by this many days (estimates only).' },
            subjectTo: { enum: ['isbat'], description: 'Decreed date that a later Kemenag isbat decision may still change.' },
          },
        },
        HolidayResponse: {
          type: 'object',
          properties: {
            year: { type: 'integer' }, status: { enum: ['official', 'estimated', 'unverified'] }, updated: { type: 'string', format: 'date' }, version: { type: 'string' },
            holidays: { type: 'array', items: { $ref: '#/components/schemas/Holiday' } },
            sources: { type: 'array', items: { type: 'object' } }, missing: { type: 'array', items: { type: 'string' } }, note: { type: 'string' }, attribution: { type: 'object' },
          },
        },
      },
    },
  };
}

function calendarPaths() {
  const lang = { name: 'lang', in: 'query', schema: { enum: ['id', 'en'], default: 'id' } };
  const int = (name: string, description: string) => ({ name, in: 'query', required: true, description, schema: { type: 'integer' } });
  return {
    '/api/v1/date': {
      get: {
        summary: 'Everything about one date: weton and neptu, Javanese (kraton and Aboge kurup), Hijri (tabular and Umm al-Qura), Chinese (HKO), observances, holidays',
        parameters: [{ name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' } }, lang],
        responses: { 200: { description: 'Date description. `chinese` is null before 1900-12-22; `islamic.umalqura` is null if the runtime lacks ICU data.' }, 400: error },
      },
    },
    '/api/v1/convert': {
      get: {
        summary: 'Convert a Hijri, Javanese or Chinese date to Gregorian',
        parameters: [
          { name: 'calendar', in: 'query', required: true, schema: { enum: ['islamic', 'javanese', 'chinese'] } },
          int('year', 'Hijri 1317-1525, Javanese 1817-2034, or Chinese lunar year 1900-2100 (Gregorian year in which it began)'),
          int('month', '1-12'), int('day', '1-30'),
          { name: 'method', in: 'query', description: 'Hijri only', schema: { enum: ['civil', 'umalqura'], default: 'civil' } },
          { name: 'kurup', in: 'query', description: 'Javanese only', schema: { enum: ['asapon', 'aboge'], default: 'asapon' } },
          { name: 'leap', in: 'query', description: 'Chinese only: leap month', schema: { type: 'boolean', default: false } },
          lang,
        ],
        responses: { 200: { description: 'Gregorian date plus its full description' }, 400: error, 501: { description: 'Method unavailable in this runtime' } },
      },
    },
    '/api/v1/observances': {
      get: {
        summary: 'Calculated religious and cultural observances for a year (not public holidays)',
        parameters: [year, lang],
        responses: { 200: { description: 'Observances; Islamic ones carry uncertaintyDays = 1' }, 400: error },
      },
    },
    '/api/v1/calendars': { get: { summary: 'Supported calendar systems, methods and date ranges', responses: { 200: { description: 'Calendar metadata' } } } },
  };
}
