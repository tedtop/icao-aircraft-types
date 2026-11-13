# icao-aircraft-types

Every aircraft type designator in ICAO Doc 8643 (`B739`, `E75L`, `C172`, ...),
with manufacturer, model names, class code, wake category and engines, plus
lookup, ranked search, and a helper that matches registry-style
manufacturer/model strings to a designator.

- 2,614 designators across 7,261 model rows, bundled as JSON (no network calls at runtime)
- No dependencies, Node 18+, CommonJS with TypeScript types
- `npm run update-data` re-fetches the list from ICAO

## Usage

```js
const icao = require('icao-aircraft-types');

icao.format('B39M');
// "Boeing 737 MAX 9 (B39M)"

icao.get('E75L');
// {
//   designator: 'E75L',
//   manufacturer: 'EMBRAER',
//   manufacturerName: 'Embraer',
//   name: '175 (long wing)',
//   models: ['175 (long wing)', 'ERJ-170-200 (long wing)'],
//   classCode: 'L2J',      // landplane, 2 engines, jet
//   wakeCategory: 'M',
//   engineCount: 2,
//   engineType: 'Jet',
//   aircraftKind: 'LandPlane'
// }

icao.search('gulfstream g650');   // ranked designator summaries
icao.findByModel('EMBRAER S A', 'ERJ 190-100');   // "E190"
icao.resolveManufacturer('Airbus Industrie');     // "AIRBUS"
```

### API

| Function | Returns |
| --- | --- |
| `get(designator)` | Summary for a designator (case and whitespace tolerant), or `null` |
| `format(designator)` | `"Boeing 737-900 (B739)"`, or `null` |
| `search(query, { limit = 20 })` | Summaries ranked: exact designator, designator prefix, model-name prefix, then substring |
| `resolveManufacturer(name)` | The ICAO manufacturer string for a registry-style name (`"EMBRAER S A"` -> `"EMBRAER"`), or `null` |
| `findByModel(manufacturer, model)` | A designator for a manufacturer + model name as a registry writes them, or `null` |
| `models` | Every raw row |
| `designators` | Every designator |
| `source` | `{ url, fetchedAt }` for the bundled data |

### What `findByModel` does and doesn't do

It matches a model name exactly (ignoring spaces and punctuation), then
retries with trailing characters dropped. It returns a designator only when
every candidate agrees, and `null` rather than guessing otherwise.

It does not know registry quirks that need aviation knowledge. For example the
FAA lists a Boeing as `737-924ER` where Doc 8643 says `737-900`, and an
Embraer 175 as `ERJ 170-200 LR`. Handle those in your own code and call
`findByModel` with the normalized name.

## Updating the data

```bash
npm run update-data
npm test
```

The script POSTs to ICAO's public Doc 8643 service (the one behind the
[type designator search page](https://www.icao.int/operational-safety/doc-8643-aircraft-type-designators/search))
and refuses to overwrite `data/types.json` if the response looks wrong.

## Data source and licence

The code is MIT. The bundled data comes from ICAO Doc 8643, which is ICAO's
publication: check ICAO's terms before redistributing the data in ways beyond
using this package. This package is not affiliated with or endorsed by ICAO.
