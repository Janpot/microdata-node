
'use strict';

var rdfToJsonld = require('../lib/rdfToJsonld');
var n3 = require('n3');


function expandPrefixedName(name, prefixes) {
  try {
    return n3.Util.expandPrefixedName(name, prefixes);
  } catch (e) {
    return name;
  }
}

function n3Totriples(triples, prefixes) {
  function toTripleObject(n3Object) {
    var object = {};
    if (n3.Util.isLiteral(n3Object)) {
      object.value = n3.Util.getLiteralValue(n3Object);
      object.type = n3.Util.getLiteralType(n3Object);
    } else {
      if (n3.Util.isUri(n3Object)) {
        object.id = expandPrefixedName(n3Object, prefixes);
      } else {
        object.id = n3Object;
      }
    }
    return object;
  }
  return triples
    .map(function (triple) {
      return {
        subject: triple.subject,
        predicate: triple.predicate,
        object: toTripleObject(triple.object)
      };
    });
}

function ttlToJsonld(turtle, base, callback) {
  var triples = [];
  var parser = n3.Parser({
    documentURI: base
  });
  parser.parse(turtle, function (error, triple, prefixes) {
    if (error) {
      return callback(error);
    }
    if (triple) {
      triples.push(triple);
    } else {
      callback(null, rdfToJsonld(n3Totriples(triples, prefixes)));
    }
  });
}

module.exports = ttlToJsonld;
