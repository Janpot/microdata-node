'use strict';

var DOM = require('domutils');
var unique = require('array-unique');
var urlUtil = require('url');
var isAbsoluteUrl = require('is-absolute-url');
var constants = require('./constants');

var XSD__DOUBLE = constants.XSD__DOUBLE;
var XSD__INTEGER = constants.XSD__INTEGER;
var XSD__DATE = constants.XSD__DATE;
var XSD__TIME = constants.XSD__TIME;
var XSD__DATE_TIME = constants.XSD__DATE_TIME;
var XSD__G_YEAR_MONTH = constants.XSD__G_YEAR_MONTH;
var XSD__G_YEAR = constants.XSD__G_YEAR;
var XSD__DURATION = constants.XSD__DURATION;


function splitUnique(string) {
  return unique(string.trim().split(/\s+/));
}

function walk(nodes, visit) {
  nodes.forEach(function (node) {
    visit(node);
    if (node.children) walk(node.children, visit);
  });
}

function mapIds(dom) {
  var idMap = {};
  walk(dom, function (node) {
    var id = DOM.getAttributeValue(node, 'id');
    if (id && !idMap[id]) idMap[id] = node;
  });
  return idMap;
}

module.exports = function (dom, base) {

  base = base || '';
  var idMap = mapIds(dom);

  function getItems() {
    var items = [];
    walk(dom, function (node) {
      if (isItem(node) && !isProperty(node)) {
        items.push(node);
      }
    });
    return items;
  }

  function getProperties(root) {
    var results = [],
        memory = [],
        pending = [];

    memory.push(root);

    if (root.children) {
      pending = pending.concat(root.children);
    }

    if (root.attribs.itemref) {
      splitUnique(root.attribs.itemref)
        .forEach(function (id) {
          if (idMap[id]) pending.push(idMap[id]);
        });
    }

    var current = pending.shift();
    while (current) {
      if (memory.indexOf(current) < 0) {
        memory.push(current);
        if (current.children && !isItem(current)) {
          pending = pending.concat(current.children);
        }
        var props = getPropertyNames(current);
        if (props.length > 0) {
          results.push(current);
        }
      }
      current = pending.shift();
    }

    results.sort(DOM.compareDocumentPosition);

    return results;
  }

  function isItem(element) {
    return DOM.hasAttrib(element, 'itemscope');
  }

  function isProperty(element) {
    return DOM.hasAttrib(element, 'itemprop');
  }

  function getItemId(item) {
    var id = DOM.getAttributeValue(item, 'itemid');
    if (id) {
      id = id.trim();
      if (isAbsoluteUrl(id)) return id;
      return urlUtil.resolve(base, id);
    }
    return null;
  }

  function getItemType(item) {
    var itemType = DOM.getAttributeValue(item, 'itemtype');
    var types = (itemType ? splitUnique(itemType) : [])
      .filter(isAbsoluteUrl);
    return types;
  }

  function getPropertyNames(element) {
    var itemProp = DOM.getAttributeValue(element, 'itemprop');
    return itemProp ? splitUnique(itemProp) : [];
  }

  var srcProperty = ['audio', 'embed', 'iframe', 'img', 'source', 'track', 'video'];
  var hrefProperty = ['a', 'area', 'link'];
  function isName(element, names) {
    var tagname = DOM.getName(element);
    return names.indexOf(tagname) >= 0;
  }

  function resolveUrlProperty(value) {
    if (!value) return { value: '' };
    return {
      id: isAbsoluteUrl(value) ? value : urlUtil.resolve(base, value)
    };
  }

  function resolveProperty(value) {
    return { value: value || '' };
  }

  function resolveNumberProperty(value) {
    var number = Number(value);
    if (isNaN(number)) return { value: value || '' };
    var isInt = number === parseInt(number, 10);
    return {
      value: number,
      type: isInt ? XSD__INTEGER : XSD__DOUBLE
    };
  }


  function resolveDateProperty(value) {
    value = value || '';
    var result = {
      value: value
    };
    if (/^\d{4}\-\d{2}\-\d{2}$/.test(value)) {
      result.type = XSD__DATE;
    } else if (/^\d{2}\:\d{2}(?:\:\d{2}(?:\.\d+)?)?(?:[AZ]|[\+\-]\d{2}(?:\:\d{2})?)?$/.test(value)) {
      result.type = XSD__TIME;
    } else if (/^\d{4}\-\d{2}\-\d{2}T\d{2}\:\d{2}(?:\:\d{2}(?:\.\d+)?)?(?:[AZ]|[\+\-]\d{2}(?:\:\d{2})?)?$/.test(value)) {
      result.type = XSD__DATE_TIME;
    } else if (/^\d{4}\-\d{2}$/.test(value)) {
      result.type = XSD__G_YEAR_MONTH;
    } else if (/^\d+$/.test(value)) {
      result.type = XSD__G_YEAR;
    } else if (/^\-?P(?:(?:\d+Y)?(?:\d+M)?(?:\d+D)?)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$/.test(value)) {
      result.type = XSD__DURATION;
    }
    return result;
  }

  function getItemValue(element) {
    if (!isProperty(element)) return null;
    if (isItem(element)) return element;
    if (isName(element, srcProperty)) {
      return resolveUrlProperty(DOM.getAttributeValue(element, 'src'));
    }
    if (isName(element, hrefProperty)) {
      return resolveUrlProperty(DOM.getAttributeValue(element, 'href'));
    }
    if (isName(element, [ 'meta' ])) {
      return resolveProperty(DOM.getAttributeValue(element, 'content'));
    }
    if (isName(element, [ 'object' ])) {
      return resolveUrlProperty(DOM.getAttributeValue(element, 'data'));
    }
    if (isName(element, [ 'data', 'meter' ])) {
      return resolveNumberProperty(DOM.getAttributeValue(element, 'value'));
    }
    if (isName(element, [ 'time' ])) {
      return resolveDateProperty(DOM.getAttributeValue(element, 'datetime'));
    }

    return resolveProperty(DOM.getText(element));
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

