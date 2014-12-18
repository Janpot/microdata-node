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

  $nodes = $nodes || $.root();
  config = config || {};
  var items = [];

  function walkNodes($nodes, currentItem, memory) {
    $nodes.each(function (i, node) {
      var $node = $(node);
      var prop = splitUnique($node.attr('itemprop'));

      if (prop && currentItem) {
        prop.forEach(function (propName) {
          var value = parseProperty(node, memory);
          currentItem.addProperty(propName, value);
        });
      } else if ($node.is('[itemscope]')) {
        var newItem = parseItem(node, memory);
        if (newItem !== Item.ERROR) {
          items.push(newItem);
        }
      } else {
        walkNodes($node.children(), currentItem, memory);
      }
    });
  }

  function parseItem(node, memory) {
    // REMARK: note the raw dom node instead of $node to guarantee uniqueness
    if (memory.indexOf(node) >= 0) {
      return Item.ERROR;
    }
    var newMemory = cloneArray(memory);
    newMemory.push(node);

    var $node = $(node);

    var item = new Item({
      type: splitUnique($node.attr('itemtype')),
      id: $node.attr('itemid')
    });

    var refs = splitUnique($node.attr('itemref'));
    if (refs) {
      var refsSelector = refs
        .map(function makeIdSelector(id) {
          return '#' + id;
        })
        .join(',');
      
      walkNodes($(refsSelector), item, newMemory);
    }

    walkNodes($node.children(), item, newMemory);

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

  function parseProperty(node, memory) {
    var $node = $(node);
    if ($node.is('[itemscope]')) {
      return parseItem(node, memory);
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
      return $node.text() || '';
    }
  }

  walkNodes($nodes, null, []);

  return {
    items: items.map(function (item) {
      return item.serialize();
    })
  };
}

exports.parse = parse;
