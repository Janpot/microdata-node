'use strict';

var htmlparser = require('htmlparser2');
var Map = require('es6-map');
var urlUtil = require('url');
var isAbsoluteUrl = require('is-absolute-url');
var microdataDom = require('./microdataDom');

var RDF__TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

function removeHashFragment(url) {
  var parsed = urlUtil.parse(url);
  parsed.hash = null;
  return urlUtil.format(parsed);
}

function microdataToRdf(html, config) {
  config = config || {};
  var registry = config.registry || {};
  var base = config.base ? removeHashFragment(config.base) : '';

  var dom = microdataDom(htmlparser.parseDOM(html, {
    decodeEntities: true
  }), base);

  var nextId = 0;

  function generateBlankNode() {
    var blank = '_:' + nextId;
    nextId += 1;
    return blank;
  }

  function getVocab(type) {
    if (!type) return null;
    var registryVocab = Object.keys(registry).filter(function (prefix) {
      var typePrefix = type.substr(0, prefix.length);
      return prefix === typePrefix;
    })[0] || null;

    return registryVocab || type.replace(/[^#\/]*$/, '');
  }

  function generatePredicateUri(name, ctx) {
    if (isAbsoluteUrl(name)) return name;
    var fragment = encodeURIComponent(name);
    if (!ctx.currentType) return base + '#' + fragment;
    if (/[#\/]$/.test(ctx.currentVocab)) return ctx.currentVocab + fragment;
    return ctx.currentVocab + '#' + fragment;
  }

  var triples = [];

  function getEquivalents(name, ctx) {
    if (!registry[ctx.currentVocab]) return [];
    var properties = registry[ctx.currentVocab].properties;
    if (!properties) return [];
    var property = properties[name];
    if (!property) return [];
    var result = [];
    if (property.subPropertyOf) {
      result = result.concat(property.subPropertyOf);
    }
    if (property.equivalentProperty) {
      result = result.concat(property.equivalentProperty);
    }
    return result;
  }

  function generateTriples(item, ctx) {
    var subject = ctx.memory.get(item) || dom.getItemId(item) || generateBlankNode();
    ctx.memory.set(item, subject);

    var itemTypes = dom.getItemType(item, ctx);
    itemTypes
      .forEach(function (itemType) {
        triples.push({
          subject: subject,
          predicate: RDF__TYPE,
          object: { id: itemType }
        });
      });

    var type = itemTypes[0] || ctx.currentType || null;

    ctx.currentVocab = getVocab(type);

    dom.getProperties(item)
      .forEach(function (element) {
        dom.getPropertyNames(element)
          .forEach(function (name) {
            var newCtx = {
              memory: ctx.memory,
              currentType: type,
              currentVocab: ctx.currentVocab
            };
            var predicate = generatePredicateUri(name, newCtx);
            var value = null;
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

            getEquivalents(name, ctx)
              .forEach(function (equiv) {
                triples.push({
                  subject: subject,
                  predicate: equiv,
                  object: value
                });
              });
          });
      });

    return subject;
  }

  var context = {
    memory: new Map(),
    currentType: null,
    currentVocab: null
  };

  dom.getItems()
    .forEach(function (item) {
      generateTriples(item, context);
    });

  return triples;
  
}

module.exports = microdataToRdf;
