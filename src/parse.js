'use strict';

var Item = require('./Item');
var unique = require('array-unique');
var isAbsoluteUrl = require('is-absolute-url');
var util = require('util');
var { tryResolve } = require('./urls');

// splits a string on whitespaces and removes duplicate values
function splitUnique (string) {
  string = string && string.trim();
  if (string) {
    return unique(string.split(/\s+/));
  } else {
    return undefined;
  }
}

function parse ($, $nodes, config) {
  config = config || {};
  var items = [];

  // resolve the base url of the document
  var base = config.base || '';
  var baseTagHref = $('base[href]').attr('href');
  if (baseTagHref) {
    base = tryResolve(baseTagHref, base);
  }

  // visits a set of nodes to be parsed and recursively visits its children
  // currentItem, if provided, contains the current microdata context
  function walkNodes ($nodes, currentItem) {
    $nodes.each(function (i, node) {
      var $node = $(node);
      var props = splitUnique($node.attr('itemprop'));

      if (props && currentItem) {
        var value = null;
        if ($node.is('[itemscope]')) {
          value = parseItem(node, currentItem);
        } else {
          value = parsePropertyValue(node);
          walkNodes($node.children(), currentItem);
        }
        currentItem.addProperties(props, value);
      } else if ($node.is('[itemscope]') && !$node.is('[itemprop]')) {
        var newItem = parseItem(node, currentItem);
        if (newItem !== Item.ERROR) {
          items.push(newItem);
        }
      } else {
        walkNodes($node.children(), currentItem);
      }
    });
  }

  // parses a microdata item out of an itemscope DOM node
  function parseItem (node, currentItem) {
    // REMARK: note the raw dom node instead of $node to guarantee uniqueness
    if (currentItem && currentItem.hasMemoryOf(node)) {
      return Item.ERROR;
    }

    var $node = $(node);
    var type = splitUnique($node.attr('itemtype'));
    type = type && type.filter(isAbsoluteUrl);

    var item = new Item({
      type: type,
      id: $node.attr('itemid'),
      node: node,
      parent: currentItem
    });

    walkNodes($node.children(), item);

    // visit all nodes referenced by the current one
    var refs = splitUnique($node.attr('itemref'));
    if (refs) {
      var refsSelector = refs
        .map(function makeIdSelector (id) {
          return '#' + id;
        })
        .join(',');

      walkNodes($(refsSelector), item);
    }

    return item;
  }

  // extracts and normalizes an attribute value of a node
  function resolveAttribute ($node, attr) {
    var value = $node.attr(attr);
    return (value && value.trim()) || '';
  }

  // extracts, and normalizes a url attribute value of a node
  function resolveUrlAttribute ($node, attr) {
    var url = $node.attr(attr);
    if (url === undefined) return '';
    if (isAbsoluteUrl(url)) {
      return url;
    } else {
      return tryResolve(url, base);
    }
  }

  // extracts the property value out of an itemprop DOM node
  function parsePropertyValue (node) {
    var $node = $(node);

    if ($node.is('meta')) {
      return resolveAttribute($node, 'content');
    } else if ($node.is('audio,embed,iframe,img,source,track,video')) {
      return resolveUrlAttribute($node, 'src');
    } else if ($node.is('a,area,link')) {
      return resolveUrlAttribute($node, 'href');
    } else if ($node.is('object')) {
      return resolveUrlAttribute($node, 'data');
    } else if ($node.is('data,meter')) {
      return resolveAttribute($node, 'value');
    } else if ($node.is('time')) {
      return resolveAttribute($node, 'datetime');
    } else {
      var text = $node.text();
      return text || '';
    }
  }

  walkNodes($nodes || $(':root'));

  var parsed = {
    items: items.map(function (item) {
      return item.serialize();
    })
  };

  return parsed;
}

module.exports = util.deprecate(parse, 'parse() is deprecated, use toJson()');
