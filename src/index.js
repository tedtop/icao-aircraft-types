'use strict';

const data = require('../data/types.json');

// Expand the compact column/row file into named objects once at load.
const models = data.rows.map(row => Object.fromEntries(data.columns.map((name, i) => [name, row[i]])));

// ICAO writes manufacturers in capitals ("BOEING", "AIRBUS HELICOPTERS").
// Title-case them for display, leaving short acronyms (ATR, CASA, PZL) alone.
const KEEP_UPPER = new Set(['ATR', 'CASA', 'PZL', 'HAL', 'IAI', 'GA', 'AMD', 'BAE', 'CAP', 'DHC', 'MBB', 'NAC', 'SAAB', 'SIAI', 'TBM']);
function niceManufacturer(name) {
    return name.split(' ').map(word =>
        KEEP_UPPER.has(word) ? word : word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
}

// One summary per designator. A designator covers several model names
// (B739 = "737-900" and "737-900 BBJ3"), so `models` lists them all; the
// first one (sorted) is used as the primary `name`.
const byDesignator = new Map();
for (const m of models) {
    let entry = byDesignator.get(m.designator);
    if (!entry) {
        entry = {
            designator: m.designator,
            manufacturer: m.manufacturer,
            manufacturerName: niceManufacturer(m.manufacturer),
            name: m.model,
            models: [],
            classCode: m.classCode,
            wakeCategory: m.wakeCategory,
            engineCount: m.engineCount,
            engineType: m.engineType,
            aircraftKind: m.aircraftKind
        };
        byDesignator.set(m.designator, entry);
    }
    entry.models.push(m.model);
}

function normalizeDesignator(code) {
    return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

/** Summary for a designator ("B739"), or null if it isn't in Doc 8643. */
function get(designator) {
    return byDesignator.get(normalizeDesignator(designator)) || null;
}

/** "Boeing 737-900 (B739)", or null for an unknown designator. */
function format(designator) {
    const t = get(designator);
    return t ? `${t.manufacturerName} ${t.name} (${t.designator})` : null;
}

function squash(s) {
    return String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

/**
 * Ranked free-text search over designator, manufacturer and model names:
 * exact designator, then designator prefix, then names starting with / containing
 * the query. Returns designator summaries (one per designator), best first.
 */
function search(query, { limit = 20 } = {}) {
    const q = squash(query);
    if (!q) return [];
    const scored = [];
    for (const t of byDesignator.values()) {
        let score = 0;
        if (t.designator === q) score = 100;
        else if (t.designator.startsWith(q)) score = 80;
        else {
            const names = [t.manufacturer + t.models.join(''), ...t.models.map(m => t.manufacturer + m)].map(squash);
            if (t.models.some(m => squash(m).startsWith(q))) score = 60;
            else if (names.some(n => n.includes(q))) score = 40;
        }
        if (score) scored.push([score, t]);
    }
    scored.sort((a, b) => b[0] - a[0] || a[1].designator.localeCompare(b[1].designator));
    return scored.slice(0, limit).map(([, t]) => t);
}

// Registries and operators spell manufacturers differently from Doc 8643
// ("EMBRAER S A", "BOMBARDIER INC", "AIRBUS INDUSTRIE"). Resolve to the ICAO
// manufacturer string by longest matching prefix, plus a few explicit aliases.
const MANUFACTURER_ALIASES = {
    'AIRBUS INDUSTRIE': 'AIRBUS',
    'AIRBUS SAS': 'AIRBUS',
    'THE BOEING COMPANY': 'BOEING',
    'BOEING COMPANY': 'BOEING',
    'MCDONNELL DOUGLAS': 'MCDONNELL DOUGLAS',
    'BOMBARDIER AEROSPACE': 'BOMBARDIER',
    'CANADAIR': 'BOMBARDIER'
};
const manufacturerCodes = [...new Set(models.map(m => m.manufacturer))]
    .sort((a, b) => b.length - a.length);

/** Resolves a registry-style manufacturer name to the ICAO manufacturer string, or null. */
function resolveManufacturer(name) {
    const upper = String(name || '').toUpperCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!upper) return null;
    for (const [alias, code] of Object.entries(MANUFACTURER_ALIASES)) {
        if (upper === alias || upper.startsWith(alias + ' ')) return code;
    }
    // Longest ICAO manufacturer string that the name equals or starts with at a word boundary.
    return manufacturerCodes.find(code => upper === code || upper.startsWith(code + ' ')) || null;
}

/**
 * Best-effort designator for a manufacturer + model name as a registry would
 * write them. Tries an exact (punctuation-insensitive) model-name match within
 * the manufacturer, then drops trailing characters until something matches.
 * Returns a designator only if every candidate at that match level agrees;
 * ambiguity returns null rather than guessing. Registry quirks that need
 * domain knowledge (Boeing customer codes like 737-924ER, Embraer wing
 * suffixes) are deliberately not handled here.
 */
function findByModel(manufacturer, model) {
    const maker = resolveManufacturer(manufacturer);
    const key = squash(model);
    if (!maker || !key) return null;

    const candidates = models.filter(m => m.manufacturer === maker).map(m => ({ designator: m.designator, key: squash(m.model) }));

    const exact = new Set(candidates.filter(c => c.key === key).map(c => c.designator));
    if (exact.size === 1) return [...exact][0];
    if (exact.size > 1) return null;

    // Truncate from the right, but never below 3 characters so "7" or "A3" can't match everything.
    for (let len = key.length - 1; len >= 3; len--) {
        const prefix = key.slice(0, len);
        const hits = new Set(candidates.filter(c => c.key === prefix).map(c => c.designator));
        if (hits.size === 1) return [...hits][0];
        if (hits.size > 1) return null;
    }
    return null;
}

module.exports = {
    models,
    designators: [...byDesignator.keys()],
    get,
    format,
    search,
    resolveManufacturer,
    findByModel,
    source: { url: data.source, fetchedAt: data.fetchedAt }
};
