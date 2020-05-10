'use strict';

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

function walk (nodes, visit) {
  for (const node of nodes) {
    visit(node);
    if (node.children) {
      walk(node.children, visit);
    }
  }
}

function mapIds (dom) {
  const idMap = {};
  walk(dom, (node) => {
    const id = DOM.getAttributeValue(node, 'id');
    if (id && !idMap[id]) {
      idMap[id] = node;
    }
  });
  return idMap;
}

module.exports = function (dom, config) {
  config = config || {};

  // resolve the base url of the document
  let base = config.base || '';
  const baseElem = DOM.findOne(function (elem) {
    return elem.name === 'base' && DOM.hasAttrib(elem, 'href');
  }, dom);

  if (baseElem) {
    base = tryResolve(baseElem.attribs.href, base);
  }

  const strict = config.strict;

  const idMap = mapIds(dom);

  function _getItems (nodes, isTopLevel) {
    let items = [];
    for (const node of nodes) {
      let childIsTopLEvel = isTopLevel;
      const isStrictItem = isItem(node) && !isProperty(node);
      const isNonStrictItem = isItem(node) && isTopLevel;
      const isAnItem = isStrictItem || (!strict && isNonStrictItem);
      if (isAnItem) {
        childIsTopLEvel = false;
        items.push(node);
      }
      if (node.children) {
        const childItems = _getItems(node.children, childIsTopLEvel);
        items = items.concat(childItems);
      }
    }
    return items;
  }

  function getItems () {
    return _getItems(dom, true);
  }

  function getProperties (root) {
    const results = [];
    const memory = [];
    let pending = [];

    memory.push(root);

    if (root.children) {
      pending = pending.concat(root.children);
    }

    if (root.attribs.itemref) {
      for (const id of splitUnique(root.attribs.itemref)) {
        if (idMap[id]) {
          pending.push(idMap[id]);
        }
      }
    }

    let current = pending.shift();
    while (current) {
      if (memory.indexOf(current) < 0) {
        memory.push(current);
        if (current.children && !isItem(current)) {
          pending = pending.concat(current.children);
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

  function isItem (element) {
    return DOM.hasAttrib(element, 'itemscope');
  }

  function isProperty (element) {
    return DOM.hasAttrib(element, 'itemprop');
  }

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

  function getItemType (item) {
    const itemType = DOM.getAttributeValue(item, 'itemtype');
    const types = (itemType ? splitUnique(itemType) : [])
      .filter(isAbsoluteUrl);
    return types;
  }

  function getPropertyNames (element) {
    const itemProp = DOM.getAttributeValue(element, 'itemprop');
    return itemProp ? splitUnique(itemProp) : [];
  }

  const srcProperty = ['audio', 'embed', 'iframe', 'img', 'source', 'track', 'video'];
  const hrefProperty = ['a', 'area', 'link'];
  function isName (element, names) {
    const tagname = DOM.getName(element);
    return names.indexOf(tagname) >= 0;
  }

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

  function resolveProperty (value) {
    return { value: value || '' };
  }

  function resolveNumberProperty (value) {
    const number = Number(value);
    if (isNaN(number)) {
      return { value: value || '' };
    }
    const isInt = number === parseInt(number, 10);
    return {
      value: number,
      type: isInt ? XSD__INTEGER : XSD__DOUBLE
    };
  }

  function resolveDateProperty (value) {
    value = value || '';
    const result = {
      value: value
    };
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

  function getItemValue (element) {
    if (!isProperty(element)) {
      return null;
    }
    if (isItem(element)) {
      return element;
    }
    if (DOM.hasAttrib(element, 'content')) {
      return resolveProperty(DOM.getAttributeValue(element, 'content'));
    }
    if (isName(element, srcProperty)) {
      return resolveUrlProperty(DOM.getAttributeValue(element, 'src'));
    }
    if (isName(element, hrefProperty)) {
      return resolveUrlProperty(DOM.getAttributeValue(element, 'href'));
    }
    if (isName(element, ['object'])) {
      return resolveUrlProperty(DOM.getAttributeValue(element, 'data'));
    }
    if (isName(element, ['data', 'meter'])) {
      return resolveNumberProperty(DOM.getAttributeValue(element, 'value'));
    }
    if (isName(element, ['time'])) {
      return resolveDateProperty(DOM.getAttributeValue(element, 'datetime'));
    }
    const value = DOM.getText(element);
    if (value || strict) {
      return resolveProperty(value);
    }

    return resolveProperty('');
  }

  return {
    getItems: getItems,
    getProperties: getProperties,
    getItemValue: getItemValue,
    getItemId: getItemId,
    getItemType: getItemType,
    getPropertyNames: getPropertyNames,
    isItem: isItem,
    isProperty: isProperty
  };
};
