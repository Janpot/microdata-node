'use strict';

var BASE_URL = 'http://w3c.github.io/microdata-rdf/tests';

var request = require('request');
var fs = require('fs');
var path = require('path');
var OUTPUT = path.resolve(__dirname, '../test/suite');
var registry = null;

function fetchManifestEntry(manifest) {
  if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT);
  var folderPath = OUTPUT + '/' + manifest.name;
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);
  fs.writeFileSync(folderPath + '/manifest.json', JSON.stringify(manifest, null, 2));
  request.get({
    url: BASE_URL + '/' + manifest.action
  }).pipe(fs.createWriteStream(folderPath + '/action.html'));
  if (manifest.result) {
    request.get({
      url: BASE_URL + '/' + manifest.result
    }).pipe(fs.createWriteStream(folderPath + '/result.ttl'));
  }
  if (manifest.registry) {
    request.get({
      url: manifest.registry
    }).pipe(fs.createWriteStream(folderPath + '/registry.json'));
  } else {
    fs.writeFile(folderPath + '/registry.json', JSON.stringify(registry, null, 2));
  }
}

function fetchTests(callback) {
  request.get({
    url: BASE_URL + '/manifest.jsonld',
    json: true
  }, function (err, response, manifest) {
    if (err) return callback(err);
    if (response.statusCode !== 200) {
      return callback(new Error('Bad response while fetching manifest'));
    }
    var entries = manifest['@graph'][0].entries;
    request.get({
      url: BASE_URL + '/test-registry.json',
      json: true
    }, function (err, response, _registry) {
      if (err) return callback(err);
      if (response.statusCode !== 200) {
        return callback(new Error('Bad response while fetching manifest'));
      }
      registry = _registry;
      entries.forEach(fetchManifestEntry);
    });
  });
}
 
fetchTests(function (err) {
  if (err) return console.log(err.stack);
  console.log('done');
});
