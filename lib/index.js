'use strict';

var urlUtil = require('url');
var Item = require('./Item');
var unique = require('array-unique');

// splits a string on whitespaces and removes duplicate values
function splitUnique(string) {
  string = string && string.trim();
  if (string) {
    return unique(string.split(/\s+/));
  } else {
    return undefined;
  }
}

function parse($, $nodes, config) {

  config = config || {};
  var items = [];

  // resolve the base url of the document
  var baseTagHref = $('base').attr('href') || '';
  var base = urlUtil.resolve(config.base || '', baseTagHref);

  // visits a set of nodes to be parsed and recursively visits its children
  // currentItem, if provided, contains the current microdata context
  function walkNodes($nodes, currentItem) {
    $nodes.each(function (i, node) {
      var $node = $(node);
      var props = splitUnique($node.attr('itemprop'));

      if (props && currentItem) {
        var value = parsePropertyValue(node, currentItem);
        currentItem.addProperties(props, value);
      } else if ($node.is('[itemscope]')) {
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
  function parseItem(node, currentItem) {
    // REMARK: note the raw dom node instead of $node to guarantee uniqueness
    if (currentItem && currentItem.hasMemoryOf(node)) {
      return Item.ERROR;
    }

    var $node = $(node);

    var item = new Item({
      type: splitUnique($node.attr('itemtype')),
      id: $node.attr('itemid'),
      node: node,
      parent: currentItem
    });

    // visit all nodes referenced by the current one
    var refs = splitUnique($node.attr('itemref'));
    if (refs) {
      var refsSelector = refs
        .map(function makeIdSelector(id) {
          return '#' + id;
        })
        .join(',');
      
      walkNodes($(refsSelector), item);
    }

    walkNodes($node.children(), item);

    return item;
  }

  // extracts and normalizes an attribute value of a node
  function resolveAttribute($node, attr) {
    var value = $node.attr(attr);
    return value && value.trim() || '';
  }

  // extracts, and normalizes a url attribute value of a node
  function resolveUrlAttribute($node, attr) {
    var url = $node.attr(attr);
    if (url === undefined) return '';
    return urlUtil.resolve(base, url);
  }

  // extracts the property value out of an itemprop DOM node
  function parsePropertyValue(node, currentItem) {
    var $node = $(node);
    if ($node.is('[itemscope]')) {
      return parseItem(node, currentItem);
    } else {
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
        return text && text.trim() || '';
      }
    }
  }

  walkNodes($nodes || $(':root'));

  return {
    items: items.map(function (item) {
      return item.serialize();
    })
  };
}

exports.parse = parse;
