/* global describe, it */

'use strict';

var jsonld = require('jsonld');
var microdataToRdf = require('../lib/microdataToRdf');
var ttlToJsonld = require('./ttlToJsonld');
var rdfToJsonld = require('../lib/rdfToJsonld');

var BASE_URL = 'http://w3c.github.io/microdata-rdf/tests';

var fs = require('fs');
var OUTPUT = __dirname + '/suite';
var assert = require('chai').assert;


function assertEqualRdf(jsonldExpected, jsonldGot, options, callback) {
  var opts = {
    base: options.base,
    format: 'application/nquads'
  };
  jsonld.normalize(jsonldExpected, opts, function (err, norm1) {
    if (err) {
      return callback(err);
    }
    jsonld.normalize(jsonldGot, opts, function (err, norm2) {
      if (err) {
        return callback(err);
      }
      try {
        assert.deepEqual(norm1, norm2);
        return callback();
      } catch (e) {
        return callback(e);
      }
    });
  });
}

function runOne(testFolder, it) {
  var folderPath = OUTPUT + '/' + testFolder;
  var manifest = JSON.parse(fs.readFileSync(folderPath + '/manifest.json'));

  it(manifest.name + ': ' + manifest.comment, function (done) {

    var htmlPath = folderPath + '/action.html';
    var html = fs.readFileSync(htmlPath);
    var base = BASE_URL + '/' + manifest.action;
    var registry = JSON.parse(fs.readFileSync(folderPath + '/registry.json').toString());
    var triples = microdataToRdf(html, { base: base, registry: registry });
    var jsonldGot = rdfToJsonld(triples);
    var ttl = fs.readFileSync(folderPath + '/result.ttl').toString();

    ttlToJsonld(ttl, base, function (err, jsonldExpected) {
      if (err) {
        return done(err);
      }
      assertEqualRdf(jsonldExpected, jsonldGot, { base: base }, done);
    });

  });
}

describe('suite', function () {

  var testFolders = fs.readdirSync(OUTPUT),
      only = null,
      skip = [ 'Test 0081', 'Test 0082', 'Test 0083', 'Test 0084' ];
  //only = 'Test 0001';

  testFolders.forEach(function (folder) {
    var itFn = it;
    if (folder === only) {
      itFn = it.only;
    } else if (skip.indexOf(folder) >= 0) {
      itFn = it.skip;
    }
    runOne(folder, itFn);
  });

});





