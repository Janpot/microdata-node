/* eslint-env jest */

var jsonld = require('jsonld');
var ttlToJsonld = require('./ttlToJsonld');
var toJsonld = require('..').toJsonld;

var BASE_URL = 'http://w3c.github.io/microdata-rdf/tests';

var fs = require('fs');
var path = require('path');

async function assertEqualRdf (jsonldExpected, jsonldGot, options) {
  var opts = {
    base: options.base,
    format: 'application/nquads'
  };
  const norm1 = await jsonld.normalize(jsonldExpected, opts);
  const norm2 = await jsonld.normalize(jsonldGot, opts);
  expect(norm1).toEqual(norm2);
}

function runOne (folderPath, test) {
  var manifest = JSON.parse(fs.readFileSync(folderPath + '/manifest.json'));

  test(manifest.name + ': ' + manifest.comment, async () => {
    var htmlPath = folderPath + '/action.html';
    var html = fs.readFileSync(htmlPath);
    var base = BASE_URL + '/' + manifest.action;
    var registry = JSON.parse(fs.readFileSync(folderPath + '/registry.json').toString());

    if (manifest['@type'].indexOf('rdft:TestMicrodataEval') >= 0) {
      var jsonldGot = toJsonld(html, { base: base, registry: registry, useRdfType: true, strict: true });
      var ttl = fs.readFileSync(folderPath + '/result.ttl').toString();

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
      var testFn = test;
      if (only.includes(folderName)) {
        testFn = test.only;
      } else if (skip.includes(folderName)) {
        testFn = test.skip;
      }
      var folder = path.resolve(parent, folderName);
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
