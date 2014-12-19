'use strict';

function Item(spec) {
  if (spec.type) {
    this.type = spec.type;
  }

  var idString = spec.id && spec.id.trim();
  if (idString) {
    this.id = idString;
  }

  this.memory = spec.memory || [];

  this.properties = {};
}

Item.ERROR = 'ERROR';

Item.prototype.addProperty = function addProperty(name, value) {
  if (!this.properties[name]) this.properties[name] = [];
  this.properties[name].push(value);
};

Item.prototype.serialize = function serialize() {
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
