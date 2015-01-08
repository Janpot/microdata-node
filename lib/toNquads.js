'use strict';

var util = require('util');

function formatId(id) {
  if (/^_:/.test(id)) {
    return id;
  }
  return util.format('<%s>', id);
}

function formatValue(object) {
  if (object.id) {
    return formatId(object.id);
  }
  if (object.value) {
    var value = String(object.value)
      .replace(/"/gm, '\\\"')
      .replace(/\n/gm, '\\n');
    if (object.type && object.type !== 'http://www.w3.org/2001/XMLSchema#string') {
      return util.format('"%s"^^<%s>', value, object.type);
    }
    return util.format('"%s"', value);
  }
  return '""';
}

function tripleToNquad(triple) {
  return util.format('%s %s %s.',
    formatId(triple.subject),
    formatId(triple.predicate),
    formatValue(triple.object)
  );
}

function toNquads(triples) {
  return triples
    .map(tripleToNquad)
    .sort()
    .join('\n');
}

module.exports = toNquads;
