/* global describe, it */

'use strict';

var cheerio = require('cheerio'),
    assert  = require('chai').assert,
    parser  = require('..');

describe('parser', function () {

  it('finds no data when none defined', function () {
    var $ = cheerio.load('<div>hello</div>');
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 0);
  });

  it('finds an empty item', function () {
    var $ = cheerio.load('<div itemscope>hello</div>');
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.isObject(result.items[0]);
    assert.isUndefined(result.items[0].type);
    assert.isUndefined(result.items[0].id);
    assert.isObject(result.items[0].properties);
    assert.lengthOf(Object.keys(result.items[0].properties), 0);
  });

  it('finds an item with a type', function () {
    var $ = cheerio.load('<div itemscope itemtype="http://schema.org/Person">hello</div>');
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].type, [ 'http://schema.org/Person' ]);
  });

  it('finds an item with a global id', function () {
    var $ = cheerio.load('<div itemscope itemid="urn:isbn:0-330-34032-8">hello</div>');
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].id, 'urn:isbn:0-330-34032-8');
  });

  it('finds an item with multiple types', function () {
    var $ = cheerio.load('<div itemscope itemtype=" http://schema.org/Person  http://schema.org/PostalAddress  ">hello</div>');
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].type, [
      'http://schema.org/Person',
      'http://schema.org/PostalAddress'
    ]);
  });

  it('finds an item with type defined twice', function () {
    var $ = cheerio.load('<div itemscope itemtype="http://schema.org/Person http://schema.org/Person">hello</div>');
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].type, [
      'http://schema.org/Person'
    ]);
  });

  it('finds an item within an element', function () {
    var $ = cheerio.load('<div><div itemscope itemtype="http://schema.org/Person">hello</div></div>');
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].type, ['http://schema.org/Person']);
  });

  it('finds multiple items within an element', function () {
    var $ = cheerio.load(
      '<div>' +
      '<div itemscope itemtype="http://schema.org/Person">hello</div>' +
      '<div itemscope itemtype="http://schema.org/PostalAddress">hello</div>' +
      '</div>'
    );
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 2);
    assert.deepEqual(result.items[0].type, ['http://schema.org/Person']);
    assert.deepEqual(result.items[1].type, ['http://schema.org/PostalAddress']);
  });

  it('finds an item with properties', function () {
    var $ = cheerio.load(
      '<div itemscope itemtype="http://schema.org/Person">' +
      '<div itemprop="name">Jan</div>' +
      '<div><div itemprop="age">29</div></div>' +
      '</div>'
    );
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].properties, {
      name: ['Jan'],
      age: ['29']
    });
  });

  it('finds an item with childitems', function () {
    var $ = cheerio.load(
      '<div itemscope itemtype="http://schema.org/Person">' +
      '<div itemprop="address1" itemscope itemtype="http://schema.org/PostalAddress">' +
      '<div itemprop="street">street1</div>' +
      '</div>' +
      '<div itemprop="address2" itemscope itemtype="http://schema.org/PostalAddress">' +
      '<div itemprop="street">street2</div>' +
      '</div>' +
      '</div>'
    );
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);


    assert.deepEqual(result.items[0].properties, {
      address1: [{
        type: ['http://schema.org/PostalAddress'],
        properties: { street: ['street1'] }
      }],
      address2: [{
        type: ['http://schema.org/PostalAddress'],
        properties: { street: ['street2'] }
      }]
    });
  });

  it('collates properties', function () {
    var $ = cheerio.load(
      '<div itemscope itemtype="http://schema.org/Person">' +
      '<div itemprop="name">Jan</div>' +
      '<div itemprop="name">Potoms</div>' +
      '</div>'
    );
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].properties, {
      name: ['Jan', 'Potoms']
    });
  });

  it('handles empty propertynames', function () {
    var $ = cheerio.load(
      '<div itemscope itemtype="http://schema.org/Person">' +
      '<div itemprop="">Jan</div>' +
      '</div>'
    );
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].properties, {});
  });

  it('handles multiple propertynames', function () {
    var $ = cheerio.load(
      '<div itemscope itemtype="http://schema.org/Person">' +
      '<div itemprop="name additionalName">Jan</div>' +
      '</div>'
    );
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].properties, {
      name: ['Jan'],
      additionalName: ['Jan']
    });
  });

  it('handles duplicated propertynames', function () {
    var $ = cheerio.load(
      '<div itemscope itemtype="http://schema.org/Person">' +
      '<div itemprop="  name  name ">Jan</div>' +
      '</div>'
    );
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].properties, {
      name: ['Jan']
    });
  });

  it('only parses specified nodes', function () {
    var $ = cheerio.load(
      '<div itemscope></div>' +
      '<div itemscope></div>' +
      '<div class="this-one" itemscope>' +
      '<div itemprop="name">Jan</div>' +
      '</div>'
    );
    var result = parser.parse($, $('.this-one'));
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].properties, {
      name: ['Jan']
    });
  });

});
