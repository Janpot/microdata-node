'use strict';

var urlUtil = require('url');
var Item = require('./Item');

function unique(array) {
  return array.reduce(function (uniques, item) {
    if (uniques.indexOf(item) < 0) {
      uniques.push(item);
    }
    return uniques;
  }, []);
}

function splitUnique(string) {
  string = string && string.trim();
  if (string) {
    return unique(string.split(/\s+/));
  } else {
    return undefined;
  }
}

function parse($, $nodes, config) {

  $nodes = $nodes || $.root();
  config = config || {};
  var items = [];

  function walkNodes($nodes, currentItem) {
    $nodes.each(function (i, node) {
      var $node = $(node);
      var prop = splitUnique($node.attr('itemprop'));

      if (prop && currentItem) {
        prop.forEach(function (propName) {
          var value = parseProperty($node);
          currentItem.addProperty(propName, value);
        });
      } else if ($node.is('[itemscope]')) {
        var newItem = parseItem($node);
        items.push(newItem);
      } else {
        walkNodes($node.children(), currentItem);
      }
    });
  }

  function parseItem($node) {
    var item = new Item({
      type: splitUnique($node.attr('itemtype')),
      id: $node.attr('itemid')
    });

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

  function parseProperty($node) {
    if ($node.is('[itemscope]')) {
      return parseItem($node);
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

  walkNodes($nodes);

  return {
    items: items.map(function (item) {
      return item.serialize();
    })
  };
}

exports.parse = parse;
