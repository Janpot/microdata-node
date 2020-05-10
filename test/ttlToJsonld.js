'use strict';

var rdfToJsonld = require('../lib/rdfToJsonld');
var n3 = require('n3');

function expandPrefixedName (name, prefixes) {
  try {
    return n3.Util.expandPrefixedName(name, prefixes);
  } catch (e) {
    return name;
  }
}

function n3Totriples (triples, prefixes) {
  function toTripleObject (n3Object) {
    var object = {};
    if (n3.Util.isLiteral(n3Object)) {
      object.value = n3Object.value;
      object.type = n3Object.datatype.id;
    } else {
      if (n3.Util.isNamedNode(n3Object)) {
        object.id = expandPrefixedName(n3Object.id, prefixes);
      } else {
        object.id = n3Object.id;
      }
    }
    return object;
  }
  const result = triples
    .map(function (triple) {
      return {
        subject: triple.subject.id,
        predicate: triple.predicate.id,
        object: toTripleObject(triple.object)
      };
    });
  return result;
}

async function ttlToJsonld (turtle, base) {
  return new Promise((resolve, reject) => {
    var triples = [];
    var parser = new n3.Parser({
      baseIRI: base
    });
    parser.parse(turtle, function (error, triple, prefixes) {
      if (error) {
        return reject(error);
      }
      if (triple) {
        triples.push(triple);
      } else {
        resolve(rdfToJsonld(n3Totriples(triples, prefixes), {
          useRdfType: true
        }));
      }
    });
  });
}

module.exports = ttlToJsonld;
