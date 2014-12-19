'use strict';

var urlUtil = require('url');
var Item = require('./Item');
var unique = require('array-unique');

function splitUnique(string) {
  string = string && string.trim();
  if (string) {
    return unique(string.split(/\s+/));
  } else {
    return undefined;
  }
}

function cloneArray(array) {
  return array.map(function (item) {
    return item;
  });
}

function parse($, $nodes, config) {

  config = config || {};
  var items = [];

  function walkNodes($nodes, currentItem) {
    $nodes.each(function (i, node) {
      var $node = $(node);
      var props = splitUnique($node.attr('itemprop'));

      if (props && currentItem) {
        var value = parseProperty(node, currentItem);
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

  function parseItem(node, currentItem) {
    // keep memory of visited nodes to detect circular structures
    // REMARK: note the raw dom node instead of $node to guarantee uniqueness
    var memory = currentItem && currentItem.memory || [];
    if (memory.indexOf(node) >= 0) {
      return Item.ERROR;
    }
    var newMemory = cloneArray(memory);
    newMemory.push(node);

    var $node = $(node);

    var item = new Item({
      type: splitUnique($node.attr('itemtype')),
      id: $node.attr('itemid'),
      memory: newMemory
    });

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

  function resolveAttribute($node, attr) {
    return $node.attr(attr) || '';
  }

  function resolveUrlAttribute($node, attr) {
    var relative = $node.attr(attr);
    if (relative && config.base) {
      return urlUtil.resolve(config.base, relative) || '';
    } else {
      return relative || '';
    }
  }

  function parseProperty(node, currentItem) {
    var $node = $(node);
    if ($node.is('[itemscope]')) {
      return parseItem(node, currentItem);
    } else if ($node.is('meta')) {
      return resolveAttribute($node, 'content');
    } else if ($node.is('audio,embed,iframe,img,source,track,video')) {
      return resolveUrlAttribute($node, 'src');
    } else if ($node.is('a,area,link')) {
      return resolveUrlAttribute($node, 'href');
    } else if ($node.is('object')) {
      return resolveUrlAttribute($node, 'data');
    } else if ($node.is('data')) {
      return resolveAttribute($node, 'value');
    } else if ($node.is('meter')) {
      return resolveAttribute($node, 'value');
    } else if ($node.is('time')) {
      return resolveAttribute($node, 'datetime');
    } else {
      var text = $node.text();
      text = text && text.trim();
      return text || '';
    }
  }

  walkNodes($nodes || $.root());

  return {
    items: items.map(function (item) {
      return item.serialize();
    })
  };
}

exports.parse = parse;
