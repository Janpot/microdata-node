'use strict';

var microdataToRdf = require('./microdataToRdf');
var rdfToJsonld = require('./rdfToJsonld');

function toJsonld(microdataHtml, config) {
  return rdfToJsonld(microdataToRdf(microdataHtml, config), config);
}

module.exports = toJsonld;
