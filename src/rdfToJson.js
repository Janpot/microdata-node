const { RDF__TYPE } = require('./constants');
const { isNamedNode } = require('./microdataToRdf');

/**
 * @typedef {string | boolean | number | JsonItem} JsonPropertyValue
 * @typedef {{ id?: string, type?: string[], properties: { [key: string]: JsonPropertyValue[] } }} JsonItem
 * @typedef {{ items: JsonItem[] }} JsonResult
 */

/**
  * @param {string} id
  * @returns {boolean}
  */
function isBlank (id) {
  return id.indexOf('_:') === 0;
}

/**
 * @param {string} name
 * @param {string[]} types
 * @param {string} base
 * @returns {string}
 */
function resolveProperty (name, types, base) {
  return types
    .map((type) => type.replace(/[^#/]*$/, ''))
    .concat([base + '#'])
    .reduce(function (toResolve, type) {
      if (toResolve.indexOf(type) === 0) {
        return toResolve.slice(type.length);
      } else {
        return toResolve;
      }
    }, name);
}

/**
 * @param {JsonItem[]} items
 * @param {JsonPropertyValue[]} ancestors
 */
function removeCircular (items, ancestors = []) {
  for (const item of items) {
    const newAncestors = ancestors.concat([item]);
    for (const [property, values] of Object.entries(item.properties)) {
      item.properties[property] = values
        .map((value) => {
          if (newAncestors.indexOf(value) >= 0) {
            return 'ERROR';
          } else {
            return value;
          }
        });

      const subItems = /** @type {JsonItem[]} */(values.filter((value) => typeof value === 'object'));

      removeCircular(subItems, newAncestors);
    }
  }
}

/**
 * @param {import('./microdataToRdf').Triple[]} triples
 * @param {import('./index').Config} config
 * @returns {JsonResult}
 */
function rdfToJson (triples, config) {
  const itemMap = triples.reduce((itemMap, triple) => {
    const id = triple.subject;
    if (!itemMap[id]) {
      /** @type {JsonItem} */
      const item = { properties: {} };
      if (!isBlank(id)) {
        item.id = id;
      }
      itemMap[id] = item;
    }
    return itemMap;
  }, /** @type {{ [id: string]: JsonItem }} */({}));

  let topLevelItems = Object.keys(itemMap);

  triples.forEach(function (triple) {
    const base = config.base || '';
    const item = itemMap[triple.subject];

    if (triple.predicate === RDF__TYPE) {
      if (isNamedNode(triple.object)) {
        item.type = item.type || [];
        item.type.push(triple.object.id);
      }
    } else {
      const property = resolveProperty(triple.predicate, item.type || [], base);
      const value = item.properties[property] || [];
      const object = triple.object;
      if (isNamedNode(object)) {
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

  return { items };
}

module.exports = rdfToJson;
