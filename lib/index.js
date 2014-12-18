'use strict';

var util = require('util'),
    urlUtil = require('url');

function createScope(spec) {

  return {
    type: spec.type || null,
    id: spec.id || null,
    props: {}
  };

}

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

  function walkNode(node, parentScope) {
    var currentScope = parentScope;
    var newScope = null;

    if (node.attr('itemscope') !== undefined) {
      newScope = createScope({
        type: node.attr('itemtype'),
        id: node.attr('itemid')
      });
    }

    var prop = node.attr('itemprop');
    if (prop === undefined) {
      if (newScope) {
        items.push(newScope);
      }
    } else {
      var value = newScope || parseValue(node);
      if (currentScope.props[prop] === undefined) {
        currentScope.props[prop] = value;
      } else {
        if (!util.isArray(currentScope.props[prop])) {
          currentScope.props[prop] = [ currentScope.props[prop] ];
        }
        currentScope.props[prop].push(value);
      }
    }

    node.children().each(function (i, child) {
      walkNode($(child), newScope || currentScope);
    });

  }

  var rootScope = createScope({});
  walkNode($.root(), rootScope);

  return items;
}

exports.parse = parse;
