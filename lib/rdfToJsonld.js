'use strict';

var constants = require('./constants');

var RDF__TYPE = constants.RDF__TYPE;
var RDF__NIL = constants.RDF__NIL;
var RDF__FIRST = constants.RDF__FIRST;
var RDF__REST = constants.RDF__REST;
var RDF__LIST = constants.RDF__LIST;
var XSD__DOUBLE = constants.XSD__DOUBLE;
var XSD__INTEGER = constants.XSD__INTEGER;
var XSD__BOOLEAN = constants.XSD__BOOLEAN;
var XSD__STRING = constants.XSD__STRING;

function equivalentObjects(objA, objB) {
  var keysA = Object.keys(objA);
  var keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) {
    return false;
  }
  var sameKeys = keysA.every(function (key) {
    return keysB.indexOf(key) >= 0;
  });
  if (!sameKeys) {
    return false;
  }
  var sameValues = keysA.every(function (key) {
    return objA[key] === objB[key];
  });
  return sameValues;
}

function rdfObjectToJsonldObject(object, useNativeTypes) {
  if (object.id) {
    return { '@id': object.id };
  }
  var value = object.value.toString();
  var result = {};
  var convertedValue = value;
  var type = null;
  if (useNativeTypes && object.type === XSD__BOOLEAN) {
    if (/^true|false$/i.test(value)) {
      convertedValue = /^true$/i.test(value);
    } else {
      type = object.type;
    }
  } else if (useNativeTypes && (object.type === XSD__DOUBLE || object.type === XSD__INTEGER)) {
    var numberValue = Number(value);
    if (!isNaN(numberValue)) {
      convertedValue = numberValue;
    } else {
      type = object.type;
    }
  } else if (object.language) {
    result['@language'] = object.language;
  } else if (object.type !== XSD__STRING) {
    type = object.type;
  }
  result['@value'] = convertedValue;
  if (type) {
    result['@type'] = type;
  }
  return result;
}

function isWellFormedListNode(node) {
  if (!node.usages || node.usages.length !== 1) {
    return false;
  }
  if (!node[RDF__FIRST] || node[RDF__FIRST].length !== 1) {
    return false;
  }
  if (!node[RDF__REST] || node[RDF__REST].length !== 1) {
    return false;
  }
  if (node['@type'] && (node['@type'].length !== 1 || node['@type'][0] !== RDF__LIST)) {
    return false;
  }
  return true;
}

function getGraphs(triples) {
  return triples.reduce(function (graphs, triple) {
    var name = triple.graph || '';
    graphs[name] = graphs[name] || [];
    graphs[name].push(triple);
    return graphs;
  }, {});
}

// http://www.w3.org/TR/json-ld-api/#serialize-rdf-as-json-ld-algorithm
function rdfToJsonld(triples, config) {
  var useRdfType = config.useRdfType;
  var useNativeTypes = config.useNativeTypes;

  var graphs = getGraphs(triples);
  var defaultGraph = {};
  var graphMap = {
    '@default': defaultGraph
  };

  Object.keys(graphs)
    .forEach(function (name) {
      var triples = graphs[name];
      if (name === '') {
        name = '@default';
      } else if (!defaultGraph[name]) {
        defaultGraph[name] = {
          '@id': name
        };
      }
      graphMap[name] = graphMap[name] || {};
      var nodeMap = graphMap[name];
      triples.forEach(function (triple) {
        if (!nodeMap[triple.subject]) {
          nodeMap[triple.subject] = {
            '@id': triple.subject
          };
        }
        var node = nodeMap[triple.subject];
        var object = triple.object;
        if (object.id) {
          if (!nodeMap[object.id]) {
            nodeMap[object.id] = {
              '@id': object.id
            };
          }
        }
        if (triple.predicate === RDF__TYPE && !useRdfType && object.id) {
          if (!node['@type']) {
            node['@type'] = [ object.id ];
          }
          return 'continue';
        }

        var value = rdfObjectToJsonldObject(object, useNativeTypes);
        if (!node[triple.predicate]) {
          node[triple.predicate] = [];
        }
        var alreadyExists = node[triple.predicate].some(function (existingValue) {
          var areEquivalent = equivalentObjects(value, existingValue);
          return areEquivalent;
        });
        if (!alreadyExists) {
          node[triple.predicate].push(value);
        }
        if (object.id) {
          if (!node.usages) {
            node.usages = [];
          }
          node.usages.push({
            node: node,
            property: triple.predicate,
            value: value
          });
        }
      });
    });

  Object.keys(graphMap)
    .forEach(function (name) {
      var graph = graphMap[name];
      var nil = graph[RDF__NIL];
      if (!nil) {
        return 'continue';
      }
      nil.usages
        .forEach(function (usage) {
          var node = usage.node;
          var property = usage.property;
          var head = usage.value;
          var list = [];
          var listNodes = [];

          while (property === RDF__REST && isWellFormedListNode(node)) {
            list.push(node[RDF__FIRST][0]);
            listNodes.push(node['@id']);
            var nodeUsage = node.usages[0];
            node = nodeUsage.node;
            property = nodeUsage.property;
            head = nodeUsage.value;
            if (!/^_:/.test(node['@id'])) {
              break;
            }
          }

          if (property === RDF__FIRST) {
            if (node['@id'] === RDF__NIL) {
              return 'continue';
            }
            var headId = head['@id'];
            head = graph[headId];
            head = head[RDF__REST][0];
            list.pop();
            listNodes.pop();
          }

          delete head['@id'];
          list.reverse();
          head['@list'] = list;
          listNodes
            .forEach(function (nodeId) {
              delete graph[nodeId];
            });
        });
    });

  var result = [];
  Object.keys(defaultGraph)
    .sort()
    .forEach(function (subject) {
      var node = defaultGraph[subject];
      if (graphMap[subject]) {
        node['@graph'] = [];
        Object.keys(graphMap[subject])
          .sort()
          .forEach(function (s) {
            var n = graphMap[s];
            delete n.usages;
            if (Object.keys(n).length === 1 && n['@id']) {
              return 'continue';
            }
            node['@graph'].push(n);
          });
      }

      delete node.usages;
      if (Object.keys(node).length === 1 && node['@id']) {
        return 'continue';
      }
      result.push(node);
    });

  return result;
}

module.exports = rdfToJsonld;
