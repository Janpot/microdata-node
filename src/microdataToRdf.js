const htmlparser = require('htmlparser2');
const isAbsoluteUrl = require('is-absolute-url');
const microdataDom = require('./microdataDom');
const constants = require('./constants');

/**
 * @typedef {{ id: string }} NamedNode
 * @typedef {{ id?: undefined, value: string | number | boolean, type?: string, language?: string }} LiteralNode
 * @typedef {NamedNode | LiteralNode} Object
 * @typedef {{ subject: string, predicate: string, object: Object, graph?: string }} Triple
 *
 * @typedef {{
 *   currentVocab: string | null
 *   currentType: string | null
 *   ancestors: import('./microdataDom').Item[]
 *   memory: Map<import('./microdataDom').Item, string>
 * }} Context
 */

/**
 * @param {string} html
 * @param {import('./index').Config} config
 * @returns {Triple[]}
 */
function microdataToRdf (html, config) {
  const registry = config.registry;

  const dom = microdataDom(htmlparser.parseDOM(html, {
    decodeEntities: true
  }), config);

  let nextId = 0;

  /**
   * @returns {string}
   */
  function generateBlankNode () {
    const blank = '_:' + nextId;
    nextId += 1;
    return blank;
  }

  /**
   * @param {string | null} type
   * @returns {string | null}
   */
  function getVocab (type) {
    if (!type) {
      return null;
    }
    const registryVocab = Object.keys(registry).find((prefix) => type.startsWith(prefix));
    return registryVocab || type.replace(/[^#/]*$/, '');
  }

  /**
   * @param {string} name
   * @param {Context} ctx
   * @returns {string}
   */
  function generatePredicateUri (name, ctx) {
    if (isAbsoluteUrl(name)) {
      return name;
    }
    const fragment = encodeURIComponent(name);
    if (!ctx.currentType) {
      return config.base + '#' + fragment;
    }
    if (ctx.currentVocab && /[#/]$/.test(ctx.currentVocab)) {
      return ctx.currentVocab + fragment;
    }
    return ctx.currentVocab + '#' + fragment;
  }

  const triples = /** @type {Triple[]} */([]);

  /**
   * @param {string} name
   * @param {Context} ctx
   * @returns {string[]}
   */
  function getEquivalents (name, ctx) {
    if (!ctx.currentVocab) {
      return [];
    }
    if (!registry[ctx.currentVocab]) {
      return [];
    }
    const properties = registry[ctx.currentVocab].properties;
    if (!properties) {
      return [];
    }
    const property = properties[name];
    if (!property) {
      return [];
    }
    let result = /** @type {string[]} */([]);
    if (property.subPropertyOf) {
      result = result.concat(property.subPropertyOf);
    }
    if (property.equivalentProperty) {
      result = result.concat(property.equivalentProperty);
    }
    return result;
  }

  /**
   * @param {import('./microdataDom').Item} item
   * @param {Context} ctx
   * @returns {string}
   */
  function generateTriples (item, ctx) {
    const subject = ctx.memory.get(item) || dom.getItemId(item) || generateBlankNode();
    ctx.memory.set(item, subject);

    if (ctx.ancestors.indexOf(item) >= 0) {
      if (config.strict) {
        throw new Error('Cyclic structure');
      } else {
        return subject;
      }
    }

    const itemTypes = dom.getItemType(item);
    for (const itemType of itemTypes) {
      triples.push({
        subject: subject,
        predicate: constants.RDF__TYPE,
        object: { id: itemType }
      });
    }

    const type = itemTypes[0] || ctx.currentType || null;

    ctx.currentVocab = getVocab(type);

    const newCtx = {
      ancestors: ctx.ancestors.concat([item]),
      memory: ctx.memory,
      currentType: type,
      currentVocab: ctx.currentVocab
    };

    for (const element of dom.getProperties(item)) {
      for (const name of dom.getPropertyNames(element)) {
        const predicate = generatePredicateUri(name, newCtx);
        /** @type {Object | null} */
        let value = null;
        if (dom.isItem(element)) {
          value = { id: generateTriples(element, newCtx) };
        } else {
          value = /** @type {Object | null} */(dom.getItemValue(element));
        }

        if (value === null) continue;

        triples.push({
          subject: subject,
          predicate: predicate,
          object: value
        });

        for (const equiv of getEquivalents(name, ctx)) {
          triples.push({
            subject: subject,
            predicate: equiv,
            object: value
          });
        }
      }
    }

    return subject;
  }

  const context = {
    ancestors: [],
    memory: new Map(),
    currentType: null,
    currentVocab: null
  };

  for (const item of dom.getItems()) {
    generateTriples(item, context);
  }

  return triples;
}

/**
 * @param {Object} node
 * @returns {node is NamedNode}
 */
function isNamedNode (node) {
  return node.id !== undefined;
}

/**
 * @param {Object} node
 * @returns {node is LiteralNode}
 */
function isLiteralNode (node) {
  return node.id === undefined;
}

module.exports = microdataToRdf;
module.exports.isNamedNode = isNamedNode;
module.exports.isLiteralNode = isLiteralNode;
