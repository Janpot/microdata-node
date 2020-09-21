const microdataToRdf = require('./microdataToRdf');
const rdfToJsonld = require('./rdfToJsonld');
const rdfToJson = require('./rdfToJson');
const toNquads = require('./toNquads');

/**
 * @typedef {{ subPropertyOf?: string, equivalentProperty?: string }} VocabularyProperty
 * @typedef {{ properties?: { [name: string]: VocabularyProperty } }} Vocabulary
 * @typedef {{ [id: string]: Vocabulary }} Registry
 * @typedef {{
 *   base: string
 *   registry: Registry
 *   strict: boolean
 *   useRdfType: boolean
 *   useNativeTypes: boolean
 * }} Config
 */

/**
  * @param {string} url
  * @returns {string}
  */
function removeHashFragment (url) {
  return url.replace(/#[^#/?]$/, '');
}

/**
 * @param {Config} config
 * @returns {Config}
 */
function normalizeConfig ({
  base = '',
  registry = /** @type {Registry} */({}),
  strict = false,
  useRdfType = false,
  useNativeTypes = true
} = /** @type {Partial<Config>} */({})) {
  return {
    base: removeHashFragment(base || ''),
    registry,
    strict,
    useRdfType,
    useNativeTypes
  };
}

/**
 * @param {string} microdataHtml
 * @param {Config} config
 */
function toJsonld (microdataHtml, config) {
  config = normalizeConfig(config);
  return rdfToJsonld(microdataToRdf(microdataHtml, config), config);
}

/**
 * @param {string} microdataHtml
 * @param {Config} config
 */
function toJson (microdataHtml, config) {
  config = normalizeConfig(config);
  return rdfToJson(microdataToRdf(microdataHtml, config), config);
}

/**
 * @param {string} microdataHtml
 * @param {Config} config
 */
function toRdf(microdataHtml, config){
  config = normalizeConfig(config);
  return toNquads(microdataToRdf(microdataHtml, config));
}

exports.toJsonld = toJsonld;
exports.toJson = toJson;
exports.toRdf = toRdf;
