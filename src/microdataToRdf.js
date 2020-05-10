'use strict';

const htmlparser = require('htmlparser2');
const isAbsoluteUrl = require('is-absolute-url');
const microdataDom = require('./microdataDom');
const constants = require('./constants');

function microdataToRdf (html, config) {
  config = config || {};

  const registry = config.registry;

  const dom = microdataDom(htmlparser.parseDOM(html, {
    decodeEntities: true
  }), config);

  let nextId = 0;

  function generateBlankNode () {
    const blank = '_:' + nextId;
    nextId += 1;
    return blank;
  }

  function getVocab (type) {
    if (!type) return null;
    const registryVocab = Object.keys(registry).filter((prefix) => {
      const typePrefix = type.substr(0, prefix.length);
      return prefix === typePrefix;
    })[0] || null;

    return registryVocab || type.replace(/[^#/]*$/, '');
  }

  function generatePredicateUri (name, ctx) {
    if (isAbsoluteUrl(name)) return name;
    const fragment = encodeURIComponent(name);
    if (!ctx.currentType) return config.base + '#' + fragment;
    if (/[#/]$/.test(ctx.currentVocab)) return ctx.currentVocab + fragment;
    return ctx.currentVocab + '#' + fragment;
  }

  const triples = [];

  function getEquivalents (name, ctx) {
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
    let result = [];
    if (property.subPropertyOf) {
      result = result.concat(property.subPropertyOf);
    }
    if (property.equivalentProperty) {
      result = result.concat(property.equivalentProperty);
    }
    return result;
  }

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

    const itemTypes = dom.getItemType(item, ctx);
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
        let value = null;
        if (dom.isItem(element)) {
          value = { id: generateTriples(element, newCtx) };
        } else {
          value = dom.getItemValue(element);
        }

        if (value === null) return 'continue';

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

module.exports = microdataToRdf;
