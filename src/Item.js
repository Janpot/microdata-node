'use strict';

function Item (spec) {
  if (spec.type && spec.type.length > 0) {
    this.type = spec.type;
  }

  var idString = spec.id && spec.id.trim();
  if (idString) {
    this.id = idString;
  }

  this.parent = spec.parent || null;
  this.node = spec.node;

  this.properties = {};
}

Item.ERROR = 'ERROR';

// adds a property to this item
Item.prototype.addProperty = function addProperty (name, value) {
  if (!this.properties[name]) this.properties[name] = [];
  this.properties[name].push(value);
};

// adds a set of properties with the same value to this item
Item.prototype.addProperties = function addProperties (names, value) {
  names.forEach(function (name) {
    this.addProperty(name, value);
  }, this);
};

// checks whether this item has been visited before or is a descendant of such item
Item.prototype.hasMemoryOf = function hasMemoryOf (node) {
  if (this.node === node) {
    return true;
  } else if (this.parent) {
    return this.parent.hasMemoryOf(node);
  } else {
    return false;
  }
};

// serializes this item in a plain javascript object
Item.prototype.serialize = function serialize () {
  var item = {};

  if (this.type) {
    item.type = this.type;
  }

  if (this.id) {
    item.id = this.id;
  }

  item.properties = {};
  Object.keys(this.properties).forEach(function (propName) {
    var values = this.properties[propName];

    if (values === Item.ERROR) {
      item.properties[propName] = Item.ERROR;
    } else {
      var serializedValues = values.map(function (value) {
        if (value instanceof Item) {
          return value.serialize();
        } else {
          return value;
        }
      }, this);

      item.properties[propName] = serializedValues;
    }
  }, this);

  return item;
};

module.exports = Item;
