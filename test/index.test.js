'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const icao = require('../src/index.js');

test('loads the full Doc 8643 list', () => {
    assert.ok(icao.models.length > 5000);
    assert.ok(icao.designators.length > 2000);
});

test('get() returns a summary and is case/space tolerant', () => {
    const t = icao.get(' b739 ');
    assert.equal(t.designator, 'B739');
    assert.equal(t.manufacturer, 'BOEING');
    assert.equal(t.manufacturerName, 'Boeing');
    assert.equal(t.name, '737-900');
    assert.ok(t.models.includes('737-900 BBJ3'));
    assert.equal(t.classCode, 'L2J');
    assert.equal(t.engineType, 'Jet');
    assert.equal(icao.get('NOPE'), null);
    assert.equal(icao.get(undefined), null);
});

test('format()', () => {
    assert.equal(icao.format('B739'), 'Boeing 737-900 (B739)');
    assert.equal(icao.format('zzzz'), null);
});

test('search ranks exact designator first, then names', () => {
    assert.equal(icao.search('b39m')[0].designator, 'B39M');
    assert.ok(icao.search('737 max 9').some(t => t.designator === 'B39M'));
    assert.ok(icao.search('skyhawk').some(t => t.designator === 'C172'));
    assert.deepEqual(icao.search(''), []);
    assert.ok(icao.search('b7', { limit: 3 }).length <= 3);
});

test('resolveManufacturer handles registry spellings', () => {
    assert.equal(icao.resolveManufacturer('EMBRAER S A'), 'EMBRAER');
    assert.equal(icao.resolveManufacturer('BOEING'), 'BOEING');
    assert.equal(icao.resolveManufacturer('Airbus Industrie'), 'AIRBUS');
    assert.equal(icao.resolveManufacturer('BOMBARDIER INC'), 'BOMBARDIER');
    assert.equal(icao.resolveManufacturer('NOT A MAKER'), null);
});

test('findByModel: exact, punctuation-insensitive and unambiguous', () => {
    assert.equal(icao.findByModel('BOEING', '737-9'), 'B39M');
    assert.equal(icao.findByModel('BOEING', '737 900'), 'B739');
    assert.equal(icao.findByModel('EMBRAER S A', 'ERJ 190-100'), 'E190');
});

test('findByModel returns null rather than guessing', () => {
    assert.equal(icao.findByModel('BOEING', 'ZZZ-NOPE'), null);
    assert.equal(icao.findByModel('NOT A MAKER', '737-900'), null);
    assert.equal(icao.findByModel('BOEING', ''), null);
});
