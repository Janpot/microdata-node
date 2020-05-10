'use strict';

const microdataToRdf = require('./microdataToRdf');
const rdfToJsonld = require('./rdfToJsonld');
const rdfToJson = require('./rdfToJson');

function removeHashFragment (url) {
  return url.replace(/#[^#/?]$/, '');
}

function normalizeConfig (config) {
  config = {
    base: '',
    registry: {},
    strict: false,
    useRdfType: false,
    useNativeTypes: true,
    ...config
  };

  config.base = removeHashFragment(config.base || '');
  return config;
}

function toJsonld (microdataHtml, config) {
  config = normalizeConfig(config);
  return rdfToJsonld(microdataToRdf(microdataHtml, config), config);
}

function toJson (microdataHtml, config) {
  config = normalizeConfig(config);
  return rdfToJson(microdataToRdf(microdataHtml, config), config);
}

exports.toJsonld = toJsonld;
exports.toJson = toJson;
