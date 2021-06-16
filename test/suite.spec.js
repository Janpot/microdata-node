/* eslint-env jest */

const jsonld = require('jsonld');
const ttlToJsonld = require('./ttlToJsonld');
const toJsonld = require('../src').toJsonld;

const BASE_URL = 'http://w3c.github.io/microdata-rdf/tests';

const fs = require('fs');
const path = require('path');

async function assertEqualRdf (jsonldExpected, jsonldGot, options) {
  const opts = {
    base: options.base,
    format: 'application/nquads'
  };
  const norm1 = await jsonld.normalize(jsonldExpected, opts);
  const norm2 = await jsonld.normalize(jsonldGot, opts);
  expect(norm2).toEqual(norm1);
}

function runOne (folderPath, test) {
  const manifest = JSON.parse(fs.readFileSync(folderPath + '/manifest.json'));

  test(manifest.name + ': ' + manifest.comment, async () => {
    const htmlPath = folderPath + '/action.html';
    const html = fs.readFileSync(htmlPath);
    const base = BASE_URL + '/' + manifest.action;
    const registry = JSON.parse(fs.readFileSync(folderPath + '/registry.json').toString());

    if (manifest['@type'].indexOf('rdft:TestMicrodataEval') >= 0) {
      const jsonldGot = toJsonld(html, { base: base, registry: registry, useRdfType: true, strict: true });
      const ttl = fs.readFileSync(folderPath + '/result.ttl').toString();

      const jsonldExpected = await ttlToJsonld(ttl, base);
      await assertEqualRdf(jsonldExpected, jsonldGot, { base: base });
    } else if (manifest['@type'].indexOf('rdft:TestMicrodataNegativeSyntax') >= 0) {
      expect(function () {
        toJsonld(html, { base: base, registry: registry, useRdfType: true, strict: true });
      }).toThrow();
    } else {
      throw new Error('unknown test type');
    }
  });
}

function runFolder (parent, only = [], skip = []) {
  fs.readdirSync(parent)
    .forEach(function (folderName) {
      let testFn = test;
      if (only.includes(folderName)) {
        testFn = test.only;
      } else if (skip.includes(folderName)) {
        testFn = test.skip;
      }
      const folder = path.resolve(parent, folderName);
      runOne(folder, testFn);
    });
}

describe('suite', () => {
  runFolder(
    path.resolve(__dirname, './w3c-tests'), [
      // 'Test 0001'
    ], [
      'Test 0081',
      'Test 0082',
      'Test 0083',
      'Test 0084'
    ]
  );
});
