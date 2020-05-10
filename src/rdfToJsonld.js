'use strict';

const {
  RDF__TYPE,
  RDF__NIL,
  RDF__FIRST,
  RDF__REST,
  RDF__LIST,
  XSD__DOUBLE,
  XSD__INTEGER,
  XSD__BOOLEAN,
  XSD__STRING
} = require('./constants');

function equivalentObjects (objA, objB) {
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) {
    return false;
  }
  const sameKeys = keysA.every(function (key) {
    return keysB.indexOf(key) >= 0;
  });
  if (!sameKeys) {
    return false;
  }
  const sameValues = keysA.every(function (key) {
    return objA[key] === objB[key];
  });
  return sameValues;
}

function rdfObjectToJsonldObject (object, useNativeTypes) {
  if (object.id) {
    return { '@id': object.id };
  }
  const value = object.value.toString();
  const result = {};
  let convertedValue = value;
  let type = null;
  if (useNativeTypes && object.type === XSD__BOOLEAN) {
    if (/^true|false$/i.test(value)) {
      convertedValue = /^true$/i.test(value);
    } else {
      type = object.type;
    }
  } else if (useNativeTypes && (object.type === XSD__DOUBLE || object.type === XSD__INTEGER)) {
    const numberValue = Number(value);
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

function isWellFormedListNode (node) {
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

function getGraphs (triples) {
  return triples.reduce(function (graphs, triple) {
    const name = triple.graph || '';
    graphs[name] = graphs[name] || [];
    graphs[name].push(triple);
    return graphs;
  }, {});
}

// http://www.w3.org/TR/json-ld-api/#serialize-rdf-as-json-ld-algorithm
function rdfToJsonld (triples, config) {
  const useRdfType = config.useRdfType;
  const useNativeTypes = config.useNativeTypes;

  const graphs = getGraphs(triples);
  const defaultGraph = {};
  const graphMap = {
    '@default': defaultGraph
  };

  for (let [name, triples] of Object.entries(graphs)) {
    if (name === '') {
      name = '@default';
    } else if (!defaultGraph[name]) {
      defaultGraph[name] = {
        '@id': name
      };
    }
    graphMap[name] = graphMap[name] || {};
    const nodeMap = graphMap[name];
    for (const triple of triples) {
      if (!nodeMap[triple.subject]) {
        nodeMap[triple.subject] = {
          '@id': triple.subject
        };
      }
      const node = nodeMap[triple.subject];
      const object = triple.object;
      if (object.id) {
        if (!nodeMap[object.id]) {
          nodeMap[object.id] = {
            '@id': object.id
          };
        }
      }
      if (triple.predicate === RDF__TYPE && !useRdfType && object.id) {
        if (!node['@type']) {
          node['@type'] = [object.id];
        }
        continue;
      }

      const value = rdfObjectToJsonldObject(object, useNativeTypes);
      if (!node[triple.predicate]) {
        node[triple.predicate] = [];
      }
      const alreadyExists = node[triple.predicate].some(function (existingValue) {
        const areEquivalent = equivalentObjects(value, existingValue);
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
    }
  }

  for (const [name, graph] of Object.entries(graphMap)) {
    const graph = graphMap[name];
    const nil = graph[RDF__NIL];
    if (!nil) {
      continue;
    }
    for (const usage of nil.usages) {
      let node = usage.node;
      let property = usage.property;
      let head = usage.value;
      const list = [];
      const listNodes = [];

      while (property === RDF__REST && isWellFormedListNode(node)) {
        list.push(node[RDF__FIRST][0]);
        listNodes.push(node['@id']);
        const nodeUsage = node.usages[0];
        node = nodeUsage.node;
        property = nodeUsage.property;
        head = nodeUsage.value;
        if (!/^_:/.test(node['@id'])) {
          break;
        }
      }

      if (property === RDF__FIRST) {
        if (node['@id'] === RDF__NIL) {
          continue;
        }
        const headId = head['@id'];
        head = graph[headId];
        head = head[RDF__REST][0];
        list.pop();
        listNodes.pop();
      }

      delete head['@id'];
      list.reverse();
      head['@list'] = list;
      for (const nodeId of listNodes) {
        delete graph[nodeId];
      }
    }
  }

  const result = [];
  Object.keys(defaultGraph)
    .sort()
    .forEach(function (subject) {
      const node = defaultGraph[subject];
      if (graphMap[subject]) {
        node['@graph'] = [];
        for (const s of Object.keys(graphMap[subject]).sort()) {
          const n = graphMap[s];
          delete n.usages;
          if (Object.keys(n).length === 1 && n['@id']) {
            continue;
          }
          node['@graph'].push(n);
        }
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
