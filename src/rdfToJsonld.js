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
const { isNamedNode } = require('./microdataToRdf');

/**
 * @typedef {{
 *   node: JsonldNode
 *   property: string
 *   value: JsonldValue
 * }} Usage
 * @typedef {{
 *   '@id': string
 *   '@value'?: string | number | boolean
 *   '@language'?: string
 *   '@type'?: string | string[]
 *   '@list'?: JsonldValue[]
 * }} JsonldValue
 * @typedef {{
 *   '@id': string
 *   '@type'?: string | string[]
 *   '@graph'?: JsonldGraph[]
 *   usages?: Usage[]
 *   [prop: string]: unknown
 * }} JsonldNode
 * @typedef {{
 *   [key: string]: JsonldNode
 * }} JsonldGraph
 */

/**
 * @param {any} objA
 * @param {any} objB
 * @returns {boolean}
 */
function equivalentObjects (objA, objB) {
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) {
    return false;
  }
  const sameKeys = keysA.every((key) => keysB.includes(key));
  if (!sameKeys) {
    return false;
  }
  const sameValues = keysA.every(function (key) {
    return objA[key] === objB[key];
  });
  return sameValues;
}

/**
 * @param {import('./microdataToRdf').Object} object
 * @param {boolean} useNativeTypes
 * @returns {JsonldValue}
 */
function rdfObjectToJsonldValue (object, useNativeTypes) {
  if (isNamedNode(object)) {
    return { '@id': object.id };
  }
  const value = object.value.toString();
  /** @type {JsonldValue} */
  const result = {};
  /** @type {string | number | boolean} */
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

/**
 * @typedef {JsonldNode & {
 *   '@type'?: [RDF__LIST]
 *   usages: [Usage]
 *   [RDF__FIRST]: [JsonldValue]
 *   [RDF__REST]: [JsonldValue]
 * }} ValidListNode
 * @param {JsonldNode} node
 * @returns {node is ValidListNode}
 */
function isWellFormedListNode (node) {
  if (!node.usages || node.usages.length !== 1) {
    return false;
  }
  const first = /** @type {JsonldValue[] | undefined} */(node[RDF__FIRST]);
  if (!first || first.length !== 1) {
    return false;
  }
  const rest = /** @type {JsonldValue[] | undefined} */(node[RDF__REST]);
  if (!rest || rest.length !== 1) {
    return false;
  }
  if (node['@type'] && (node['@type'].length !== 1 || node['@type'][0] !== RDF__LIST)) {
    return false;
  }
  return true;
}

/**
 * @param {import('./microdataToRdf').Triple[]} triples
 */
function getGraphs (triples) {
  return triples.reduce(function (graphs, triple) {
    const name = triple.graph || '';
    graphs[name] = graphs[name] || [];
    graphs[name].push(triple);
    return graphs;
  }, /** @type {{ [name: string]: import('./microdataToRdf').Triple[] }} */({}));
}

/**
 * http://www.w3.org/TR/json-ld-api/#serialize-rdf-as-json-ld-algorithm
 * @param {import('./microdataToRdf').Triple[]} triples
 * @param {import('./index').Config} config
 */
function rdfToJsonld (triples, config) {
  const useRdfType = config.useRdfType;
  const useNativeTypes = config.useNativeTypes;

  const graphs = getGraphs(triples);
  /** @type {JsonldGraph} */
  const defaultGraph = {};
  /** @type {{ [id: string]: JsonldGraph }} */
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
      if (isNamedNode(object)) {
        if (!nodeMap[object.id]) {
          nodeMap[object.id] = {
            '@id': object.id
          };
        }
      }
      if (triple.predicate === RDF__TYPE && !useRdfType && isNamedNode(object)) {
        if (!node['@type']) {
          node['@type'] = [object.id];
        }
        continue;
      }

      const value = rdfObjectToJsonldValue(object, useNativeTypes);
      if (!node[triple.predicate]) {
        node[triple.predicate] = [];
      }
      const existingValues = /** @type {JsonldValue[]} */(node[triple.predicate]);
      const alreadyExists = existingValues.some((existingValue) => {
        const areEquivalent = equivalentObjects(value, existingValue);
        return areEquivalent;
      });
      if (!alreadyExists) {
        existingValues.push(value);
      }
      if (isNamedNode(object)) {
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

  for (const graph of Object.values(graphMap)) {
    const nil = graph[RDF__NIL];
    if (!nil) {
      continue;
    }
    const { usages } = nil;
    if (!usages) {
      continue;
    }
    for (const usage of usages) {
      let { node, property, value: head } = usage;
      /** @type {JsonldValue[]} */
      const list = [];
      /** @type {string[]} */
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
        // @ts-ignore
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

  /** @type {JsonldNode[]} */
  const result = [];
  Object.keys(defaultGraph)
    .sort()
    .forEach((subject) => {
      const node = defaultGraph[subject];
      if (graphMap[subject]) {
        /** @type {JsonldGraph[]} */
        const graph = [];
        node['@graph'] = graph;
        for (const s of Object.keys(graphMap[subject]).sort()) {
          const n = graphMap[s];
          delete n.usages;
          if (Object.keys(n).length === 1 && n['@id']) {
            continue;
          }
          graph.push(n);
        }
      }

      delete node.usages;
      if (Object.keys(node).length === 1 && node['@id']) {
        return 'continue';
      }
      result.push(node);
      return '';
    });

  return result;
}

module.exports = rdfToJsonld;
