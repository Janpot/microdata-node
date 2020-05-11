const DOM = require('domutils');
const { splitUnique } = require('./strings');
const isAbsoluteUrl = require('is-absolute-url');
const { tryResolve } = require('./urls');
const {
  XSD__DOUBLE,
  XSD__INTEGER,
  XSD__DATE,
  XSD__TIME,
  XSD__DATE_TIME,
  XSD__G_YEAR_MONTH,
  XSD__G_YEAR,
  XSD__DURATION
} = require('./constants');

/**
 * @typedef {import('domhandler').Node} Node
 * @typedef {import('domhandler').Node[]} Dom
 * @typedef {import('domhandler').Element} Item
 * @typedef {import('./microdataToRdf').Object} ItemValue
 */

/**
 * @param {Node[]} nodes
 * @param {(node: Node) => void} visit
 */
function walk (nodes, visit) {
  for (const node of nodes) {
    visit(node);
    const children = DOM.getChildren(node);
    if (children) {
      walk(children, visit);
    }
  }
}

/**
 * @param {Dom} dom
 */
function mapIds (dom) {
  const idMap = /** @type {{ [id: string]: Node }} */({});
  walk(dom, (node) => {
    if (!DOM.isTag(node)) {
      return;
    }
    const id = DOM.getAttributeValue(node, 'id');
    if (id && !idMap[id]) {
      idMap[id] = node;
    }
  });
  return idMap;
}

/**
 * @param {Dom} dom
 * @param {import('./index').Config} config
 */
function microdataDom (dom, config) {
  // resolve the base url of the document
  let base = config.base || '';
  const baseElem = DOM.findOne((elem) => {
    return elem.name === 'base' && DOM.hasAttrib(elem, 'href');
  }, dom);

  if (baseElem) {
    base = tryResolve(baseElem.attribs.href, base);
  }

  const strict = config.strict;

  const idMap = mapIds(dom);

  /**
   * @param {Node[]} nodes
   * @param {boolean} isTopLevel
   * @returns {Item[]}
   */
  function _getItems (nodes, isTopLevel) {
    let items = /** @type {Item[]} */([]);
    for (const node of nodes) {
      let childIsTopLEvel = isTopLevel;
      if (isItem(node) && (!isProperty(node) || (!strict && isTopLevel))) {
        childIsTopLEvel = false;
        items.push(node);
      }
      const children = DOM.getChildren(node);
      if (children) {
        const childItems = _getItems(children, childIsTopLEvel);
        items = items.concat(childItems);
      }
    }
    return items;
  }

  function getItems () {
    return _getItems(dom, true);
  }

  /**
   * @param {Item} root
   */
  function getProperties (root) {
    const results = [];
    const memory = /** @type {Node[]} */([]);
    let pending = /** @type {Node[]} */([]);

    memory.push(root);

    const children = DOM.getChildren(root);
    if (children) {
      pending = pending.concat(children);
    }

    const itemrefs = splitUnique(DOM.getAttributeValue(root, 'itemref'));
    for (const id of itemrefs) {
      if (idMap[id]) {
        pending.push(idMap[id]);
      }
    }

    let current = pending.shift();
    while (current) {
      if (!memory.includes(current)) {
        memory.push(current);
        const children = DOM.getChildren(current);
        if (children && !isItem(current)) {
          pending = pending.concat(children);
        }
        const props = getPropertyNames(current);
        if (props.length > 0) {
          results.push(current);
        }
      }
      current = pending.shift();
    }

    results.sort((a, b) => {
      const order = DOM.compareDocumentPosition(a, b);
      // https://dom.spec.whatwg.org/#dom-node-comparedocumentposition
      const isPreceding = (order & 2) === 2;
      const isFollowing = (order & 4) === 4;
      return isFollowing ? 1 : isPreceding ? -1 : 0;
    });

    return results;
  }

  /**
   * @param {Node} element
   * @returns {element is Item}
   */
  function isItem (element) {
    return DOM.isTag(element) && DOM.hasAttrib(element, 'itemscope');
  }

  /**
   * @param {Node} element
   * @returns {boolean}
   */
  function isProperty (element) {
    return DOM.isTag(element) && DOM.hasAttrib(element, 'itemprop');
  }

  /**
   * @param {Item} item
   * @returns {string | null}
   */
  function getItemId (item) {
    let id = DOM.getAttributeValue(item, 'itemid');
    if (id) {
      id = id.trim();
      if (isAbsoluteUrl(id)) {
        return id;
      } else {
        return tryResolve(id, base);
      }
    }
    return null;
  }

  /**
   * @param {Item} item
   * @returns {string[]}
   */
  function getItemType (item) {
    const itemType = DOM.getAttributeValue(item, 'itemtype');
    const types = (itemType ? splitUnique(itemType) : [])
      .filter(isAbsoluteUrl);
    return types;
  }

  /**
   * @param {Node} element
   * @returns {string[]}
   */
  function getPropertyNames (element) {
    if (!DOM.isTag(element)) {
      return [];
    }
    const itemProp = DOM.getAttributeValue(element, 'itemprop');
    return itemProp ? splitUnique(itemProp) : [];
  }

  const srcProperty = ['audio', 'embed', 'iframe', 'img', 'source', 'track', 'video'];
  const hrefProperty = ['a', 'area', 'link'];

  /**
   * @param {Node} element
   * @param {string[]} names
   * @returns {boolean}
   */
  function isOneOfTags (element, names) {
    if (!DOM.isTag(element)) {
      return false;
    }
    const tagname = DOM.getName(element);
    return names.indexOf(tagname) >= 0;
  }

  /**
   * @param {string} value
   * @returns {ItemValue}
   */
  function resolveUrlProperty (value) {
    if (value && isAbsoluteUrl(value)) {
      return { id: value };
    }
    const resolved = tryResolve(value, base);
    if (!resolved) {
      return { value: '' };
    } else {
      return { id: resolved };
    }
  }

  /**
   * @param {string} value
   * @returns {ItemValue}
   */
  function resolveProperty (value) {
    return { value: value || '' };
  }

  /**
   * @param {string} value
   * @returns {ItemValue}
   */
  function resolveNumberProperty (value) {
    const number = Number(value);
    if (isNaN(number)) {
      return { value: value || '' };
    }
    return {
      value: number,
      type: Number.isInteger(number) ? XSD__INTEGER : XSD__DOUBLE
    };
  }

  /**
   * @param {string} value
   * @returns {ItemValue}
   */
  function resolveDateProperty (value) {
    value = value || '';
    const result = /** @type {import('./microdataToRdf').LiteralNode} */({
      value: value
    });
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      result.type = XSD__DATE;
    } else if (/^\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[AZ]|[+-]\d{2}(?::\d{2})?)?$/.test(value)) {
      result.type = XSD__TIME;
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[AZ]|[+-]\d{2}(?::\d{2})?)?$/.test(value)) {
      result.type = XSD__DATE_TIME;
    } else if (/^\d{4}-\d{2}$/.test(value)) {
      result.type = XSD__G_YEAR_MONTH;
    } else if (/^\d+$/.test(value)) {
      result.type = XSD__G_YEAR;
    } else if (/^-?P(?:(?:\d+Y)?(?:\d+M)?(?:\d+D)?)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$/.test(value)) {
      result.type = XSD__DURATION;
    }
    return result;
  }

  /**
   * @param {Node} element
   * @returns {ItemValue | Item | null}
   */
  function getItemValue (element) {
    if (!isProperty(element)) {
      return null;
    }
    if (isItem(element)) {
      return element;
    }
    if (DOM.isTag(element)) {
      if (DOM.hasAttrib(element, 'content')) {
        return resolveProperty(DOM.getAttributeValue(element, 'content'));
      }
      if (isOneOfTags(element, srcProperty)) {
        return resolveUrlProperty(DOM.getAttributeValue(element, 'src'));
      }
      if (isOneOfTags(element, hrefProperty)) {
        return resolveUrlProperty(DOM.getAttributeValue(element, 'href'));
      }
      if (isOneOfTags(element, ['object'])) {
        return resolveUrlProperty(DOM.getAttributeValue(element, 'data'));
      }
      if (isOneOfTags(element, ['data', 'meter'])) {
        return resolveNumberProperty(DOM.getAttributeValue(element, 'value'));
      }
      if (isOneOfTags(element, ['time'])) {
        return resolveDateProperty(DOM.getAttributeValue(element, 'datetime'));
      }
    }
    const value = DOM.getText(element);
    if (value || strict) {
      return resolveProperty(value);
    }

    return resolveProperty('');
  }

  return {
    getItems,
    getProperties,
    getItemValue,
    getItemId,
    getItemType,
    getPropertyNames,
    isItem,
    isProperty
  };
}

module.exports = microdataDom;
