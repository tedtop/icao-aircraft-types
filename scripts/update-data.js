#!/usr/bin/env node
// Regenerates data/types.json from ICAO's public Doc 8643 service (the same
// endpoint behind https://www.icao.int/operational-safety/doc-8643-aircraft-type-designators/search).
// Needs Node 18+ (global fetch). Refuses to write if the response looks wrong,
// so a bad fetch can never replace good data.
const fs = require('node:fs');
const path = require('node:path');

const URL = 'https://doc8643.icao.int/external/aircrafttypes';
const MIN_ROWS = 5000;

async function main() {
    // The service rejects a bodyless POST (HTTP 411), so send an empty body.
    const response = await fetch(URL, { method: 'POST', body: '', headers: { 'User-Agent': 'icao-aircraft-types update-data' } });
    if (!response.ok) throw new Error(`ICAO responded ${response.status}`);
    const raw = await response.json();
    if (!Array.isArray(raw) || raw.length < MIN_ROWS) throw new Error(`Unexpected response: ${Array.isArray(raw) ? raw.length + ' rows' : typeof raw}`);

    const clean = s => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '');
    // Columns in a fixed order (array-of-arrays) keeps the file small; src/index.js
    // names them back. Sorted so regenerating produces a stable, diff-able file.
    const rows = raw
        .filter(r => clean(r.Designator))
        .map(r => [
            clean(r.Designator).toUpperCase(),
            clean(r.ManufacturerCode),
            clean(r.ModelFullName),
            clean(r.Description),
            clean(r.WTC),
            Number.parseInt(r.EngineCount, 10) || 0,
            clean(r.EngineType),
            clean(r.AircraftDescription)
        ])
        .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]) || a[2].localeCompare(b[2]));

    const out = {
        source: URL,
        fetchedAt: new Date().toISOString(),
        columns: ['designator', 'manufacturer', 'model', 'classCode', 'wakeCategory', 'engineCount', 'engineType', 'aircraftKind'],
        rows
    };
    const file = path.join(__dirname, '..', 'data', 'types.json');
    fs.writeFileSync(file, JSON.stringify(out) + '\n');
    console.log(`Wrote ${rows.length} rows (${new Set(rows.map(r => r[0])).size} designators) to ${file}`);
}

main().catch(error => { console.error(error.message); process.exit(1); });
