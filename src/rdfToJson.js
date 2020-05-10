'use strict';

const constants = require('./constants');

function isBlank (id) {
  return id.indexOf('_:') === 0;
}

function resolveProperty (name, types, base) {
  types = types || [];
  return types
    .map(function (type) {
      return type
        .replace(/[^#/]*$/, '');
    })
    .concat([base + '#'])
    .reduce(function (toResolve, type) {
      if (toResolve.indexOf(type) === 0) {
        return toResolve.slice(type.length);
      } else {
        return toResolve;
      }
    }, name);
}

function removeCircular (items, ancestors) {
  ancestors = ancestors || [];
  items.forEach(function (item) {
    const newAncestors = ancestors.concat([item]);
    Object.keys(item.properties)
      .map(function (property) {
        const values = item.properties[property];
        item.properties[property] = values
          .map(function (value) {
            if (newAncestors.indexOf(value) >= 0) {
              return 'ERROR';
            } else {
              return value;
            }
          });

        const subItems = values
          .filter(function (value) {
            return typeof value === 'object';
          });

        removeCircular(subItems, newAncestors);
      });
  });
}

function rdfToJson (triples, config) {
  const itemMap = triples.reduce(function (itemMap, triple) {
    const id = triple.subject;
    if (!itemMap[id]) {
      const item = {};
      if (!isBlank(id)) {
        item.id = id;
      }
      item.properties = {};

      itemMap[id] = item;
    }
    return itemMap;
  }, {});

  let topLevelItems = Object.keys(itemMap);

  triples.forEach(function (triple) {
    config = config || {};
    const base = config.base || '';
    const item = itemMap[triple.subject];

    if (triple.predicate === constants.RDF__TYPE) {
      item.type = item.type || [];
      item.type.push(triple.object.id);
    } else {
      const property = resolveProperty(triple.predicate, item.type, base);
      const value = item.properties[property] || [];
      const object = triple.object;
      if (object.id) {
        if (isBlank(object.id)) {
          const refItem = itemMap[object.id];
          if (refItem) {
            value.push(refItem);
            topLevelItems = topLevelItems.filter(function (id) {
              return id !== object.id;
            });
          }
        } else {
          value.push(object.id);
        }
      } else {
        value.push(object.value);
      }
      if (value.length > 0) {
        item.properties[property] = value;
      }
    }
  });

  const items = topLevelItems.map(function (id) {
    return itemMap[id];
  });

  removeCircular(items, []);

  return {
    items: items
  };
}

module.exports = rdfToJson;
