'use strict';

var urlUtil = require('url');

function unique(array) {
  return array.reduce(function (uniques, item) {
    if (uniques.indexOf(item) < 0) {
      uniques.push(item);
    }
    return uniques;
  }, []);
}

function Item(spec) {
  var typeString = spec.type && spec.type.trim();
  if (typeString) {
    this.type = unique(typeString.split(/\s+/));
  }

  var idString = spec.id && spec.id.trim();
  if (idString) {
    this.id = idString;
  }

  this.properties = {};
}

Item.prototype.addProperty = function addProperty(name, value) {
  if (!this.properties[name]) this.properties[name] = [];
  this.properties[name].push(value);
};

Item.prototype.serialize = function serialize() {
  var item = {
    properties: {}
  };

  if (this.type) {
    item.type = this.type;
  }

  if (this.id) {
    item.id = this.id;
  }

  Object.keys(this.properties).forEach(function (propName) {
    var values = this.properties[propName];

    var serializedValues = values.map(function (value) {
      if (value instanceof Item) {
        return value.serialize();
      } else {
        return value;
      }
    }, this);

    item.properties[propName] = serializedValues;
  }, this);

  return item;
};



function parse($, config) {

  config = config || {};

  function parseValue(node) {
    function resolveAttribute(attr) {
      return node.attr(attr) || '';
    }

    function resolveUrlAttribute(attr) {
      var relative = node.attr(attr);
      if (relative && config.base) {
        return urlUtil.resolve(config.base, relative) || '';
      } else {
        return relative || '';
      }
    }

    if (node.is('meta')) {
      return resolveAttribute('content');
    } else if (node.is('audio,embed,iframe,img,source,track,video')) {
      return resolveUrlAttribute('src');
    } else if (node.is('a,area,link')) {
      return resolveUrlAttribute('href');
    } else if (node.is('object')) {
      return resolveUrlAttribute('data');
    } else if (node.is('data')) {
      return resolveAttribute('value');
    } else if (node.is('meter')) {
      return resolveAttribute('value');
    } else if (node.is('time')) {
      return resolveAttribute('datetime');
    }

    return node.text() || '';
  }

  var items = [];

  function walkNode(node, parentItem) {
    var currentItem = parentItem;
    var newItem = null;

    if (node.attr('itemscope') !== undefined) {
      newItem = new Item({
        type: node.attr('itemtype'),
        id: node.attr('itemid')
      });
    }

    var prop = node.attr('itemprop');
    if (prop === undefined) {
      if (newItem) {
        items.push(newItem);
      }
    } else if (currentItem) {
      var value = newItem || parseValue(node);
      currentItem.addProperty(prop, value);
    }

    node.children().each(function (i, child) {
      walkNode($(child), newItem || currentItem);
    });

  }

  walkNode($.root(), null);

  return {
    items: items.map(function (item) {
      return item.serialize();
    })
  };
}

exports.parse = parse;
