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
