'use strict';

var urlUtil = require('url');
var isAbsoluteUrl = require('is-absolute-url');

function toJsonld(microdata, base) {
  var graph = [];

  function propertyToJsonld(values, inheritedType) {
    var jsonldValues = values
      .map(function (value) {
        if (typeof value === 'string') {
          if (isAbsoluteUrl(value)) {
            return { '@id': value };
          } else {
            return { '@value': value };
          }
        } else {
          var jsonldValue = itemToJsonld(value, inheritedType);
          return jsonldValue;
        }
      });

    return jsonldValues;
  }

  function itemToJsonld(item, inheritedType) {
    var jsonldItem = {};
    
    if (item.id) {
      jsonldItem['@id'] = item.id;
    }
    
    if (item.type) {
      jsonldItem['@type'] = item.type;
    }

    function resolvePropertyName(property, type) {
      if (isAbsoluteUrl(property)) {
        return property;
      } else if (type) {
        console.log(type);
        type = type.replace(/\#.+$/, '#');
        if (/\#$/.test(type)) {
          return type + property;
        } else {
          return urlUtil.resolve(type, property);
        }
      } else {
        return base + '#' + property;
      }
    }

    Object.keys(item.properties)
      .forEach(function (property) {
        var values = item.properties[property];
        if (item.type) {
          item.type.forEach(function (type) {
            var jsonldProperty = resolvePropertyName(property, type);
            jsonldItem[jsonldProperty] = propertyToJsonld(values, type);
          });
        } else {
          var jsonldProperty = resolvePropertyName(property, inheritedType);
          jsonldItem[jsonldProperty] = propertyToJsonld(values, inheritedType);
        }
      });

    return jsonldItem;
  }

  microdata.items.forEach(function (item) {
    var jsonldItem = itemToJsonld(item);
    graph.push(jsonldItem);
  });

  return graph;
}

module.exports = toJsonld;
