const util = require('util');
const { isNamedNode, isLiteralNode } = require('./microdataToRdf');

/**
 * @param {string} id
 * @returns {string}
 */
function formatId (id) {
  if (/^_:/.test(id)) {
    return id;
  }
  return util.format('<%s>', id);
}

/**
 * @param {import('./microdataToRdf').Object} object
 * @returns {string}
 */
function formatValue (object) {
  if (isNamedNode(object)) {
    return formatId(object.id);
  }
  if (isLiteralNode(object)) {
    const value = String(object.value)
      .replace(/"/gm, '\\"')
      .replace(/\n/gm, '\\n');
    if (object.type && object.type !== 'http://www.w3.org/2001/XMLSchema#string') {
      return util.format('"%s"^^<%s>', value, object.type);
    }
    return util.format('"%s"', value);
  }
  return '""';
}

/**
 * @param {import('./microdataToRdf').Triple} triple
 * @returns {string}
 */
function tripleToNquad (triple) {
  return util.format('%s %s %s.',
    formatId(triple.subject),
    formatId(triple.predicate),
    formatValue(triple.object)
  );
}

/**
 * @param {import('./microdataToRdf').Triple[]} triples
 * @returns {string}
 */
function toNquads (triples) {
  return triples
    .map(tripleToNquad)
    .sort()
    .join('\n');
}

module.exports = toNquads;
