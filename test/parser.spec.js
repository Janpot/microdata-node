/* global describe, it */

'use strict';

var assert  = require('chai').assert,
    parser  = require('..');

describe('parser', function () {

  it('finds no data when none defined', function () {
    var html =
      '<div>hello</div>';
    var result = parser.toJson(html);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 0);
  });

  it.skip('finds an empty item', function () {
    var html =
      '<div itemscope>hello</div>';
    var result = parser.toJson(html);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.isObject(result.items[0]);
    assert.isUndefined(result.items[0].type);
    assert.isUndefined(result.items[0].id);
    assert.isObject(result.items[0].properties);
    assert.lengthOf(Object.keys(result.items[0].properties), 0);
  });

  it('finds an item with a type', function () {
    var html =
      '<div itemscope itemtype="http://schema.org/Person">hello</div>';
    var result = parser.toJson(html);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].type, [ 'http://schema.org/Person' ]);
  });

  it.skip('finds an item with a global id', function () {
    var html =
      '<div itemscope itemid="  urn:isbn:0-330-34032-8 ">hello</div>';
    var result = parser.toJson(html);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].id, 'urn:isbn:0-330-34032-8');
  });

  it('finds an item with multiple types', function () {
    var html = '<div itemscope itemtype=" http://schema.org/Person  http://schema.org/PostalAddress  ">' +
    '  hello' +
    '</div>';
    var result = parser.toJson(html);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].type, [
      'http://schema.org/Person',
      'http://schema.org/PostalAddress'
    ]);
  });

  it('finds an item with type defined twice', function () {
    var html =
      '<div itemscope itemtype="http://schema.org/Person http://schema.org/Person">' +
      '  hello' +
      '</div>';
    var result = parser.toJson(html);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].type, [
      'http://schema.org/Person'
    ]);
  });

  it('finds an item within an element', function () {
    var html =
      '<div>' +
      '  <div itemscope itemtype="http://schema.org/Person">hello</div>' +
      '</div>';
    var result = parser.toJson(html);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].type, [ 'http://schema.org/Person' ]);
  });

  it('finds multiple items within an element', function () {
    var html = 
      '<div>' +
      '  <div itemscope itemtype="http://schema.org/Person">hello</div>' +
      '  <div itemscope itemtype="http://schema.org/PostalAddress">hello</div>' +
      '</div>';
    var result = parser.toJson(html);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 2);
    assert.deepEqual(result.items[0].type, [ 'http://schema.org/Person' ]);
    assert.deepEqual(result.items[1].type, [ 'http://schema.org/PostalAddress' ]);
  });

  it('finds an item with properties', function () {
    var html = 
      '<div itemscope itemtype="http://schema.org/Person">' +
      '  <div itemprop="name">Jan</div>' +
      '  <div><div itemprop="age">29</div></div>' +
      '</div>';
    var result = parser.toJson(html);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].properties, {
      name: [ 'Jan' ],
      age: [ '29' ]
    });
  });

  it('finds an item with childitems', function () {
    var html = 
      '<div itemscope itemtype="http://schema.org/Person">' +
      '  <div itemprop="address1" itemscope itemtype="http://schema.org/PostalAddress">' +
      '    <div itemprop="street">street1</div>' +
      '  </div>' +
      '  <div itemprop="address2" itemscope itemtype="http://schema.org/PostalAddress">' +
      '    <div itemprop="street">street2</div>' +
      '  </div>' +
      '</div>';
    var result = parser.toJson(html);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);


    assert.deepEqual(result.items[0].properties, {
      address1: [{
        type: [ 'http://schema.org/PostalAddress' ],
        properties: { street: [ 'street1' ] }
      }],
      address2: [{
        type: [ 'http://schema.org/PostalAddress' ],
        properties: { street: [ 'street2' ] }
      }]
    });
  });

  it('collates properties', function () {
    var html = 
      '<div itemscope itemtype="http://schema.org/Person">' +
      '  <div itemprop="name">Jan</div>' +
      '  <div itemprop="name">Potoms</div>' +
      '</div>';
    var result = parser.toJson(html);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].properties, {
      name: [ 'Potoms', 'Jan' ]
    });
  });

  it('handles empty propertynames', function () {
    var html = 
      '<div itemscope itemtype="http://schema.org/Person">' +
      '  <div itemprop="">Jan</div>' +
      '</div>';
    var result = parser.toJson(html);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].properties, {});
  });

  it('handles multiple propertynames', function () {
    var html = 
      '<div itemscope itemtype="http://schema.org/Person">' +
      '  <div itemprop="name additionalName">Jan</div>' +
      '</div>';
    var result = parser.toJson(html);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].properties, {
      name: [ 'Jan' ],
      additionalName: [ 'Jan' ]
    });
  });

  it('handles duplicated propertynames', function () {
    var html = 
      '<div itemscope itemtype="http://schema.org/Person">' +
      '  <div itemprop="  name  name ">Jan</div>' +
      '</div>';
    var result = parser.toJson(html);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].properties, {
      name: [ 'Jan' ]
    });
  });

  it('finds top level items that are props in non-strict mode', function () {
    var html = 
      '<div itemscope itemprop="someprop">' +
      '  <div itemprop="name">Jan</div>' +
      '  <div><div itemprop="age">29</div></div>' +
      '  <div itemprop="address" itemscope>' +
      '    <span itemprop="street">my street</span>' +
      '  </div>' +
      '</div>';
    var nonStrictResult = parser.toJson(html);
    assert.isArray(nonStrictResult.items);
    assert.lengthOf(nonStrictResult.items, 1);
    assert.strictEqual(nonStrictResult.items[0].properties.name[0], 'Jan');
    var strictResult = parser.toJson(html, { strict: true });
    assert.isArray(strictResult.items);
    assert.lengthOf(strictResult.items, 0);
  });

});
