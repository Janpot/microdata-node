/* eslint-env jest */

var parser = require('..');

describe('parser', () => {
  test('finds no data when none defined', () => {
    var html =
      '<div>hello</div>';
    var result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(0);
  });

  test.skip('finds an empty item', function () {
    var html =
      '<div itemscope>hello</div>';
    var result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(typeof result.items[0]).toBe('object');
    expect(result.items[0].type).not.toBeDefined();
    expect(result.items[0].id).not.toBeDefined();
    expect(typeof result.items[0].properties).toBe('object');
    expect(Object.keys(result.items[0].properties).length).toBe(0);
  });

  test('finds an item with a type', () => {
    var html =
      '<div itemscope itemtype="http://schema.org/Person">hello</div>';
    var result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].type).toEqual(['http://schema.org/Person']);
  });

  test.skip('finds an item with a global id', function () {
    var html =
      '<div itemscope itemid="  urn:isbn:0-330-34032-8 ">hello</div>';
    var result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toEqual('urn:isbn:0-330-34032-8');
  });

  test('finds an item with multiple types', () => {
    var html = '<div itemscope itemtype=" http://schema.org/Person  http://schema.org/PostalAddress  ">' +
    '  hello' +
    '</div>';
    var result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].type).toEqual([
      'http://schema.org/Person',
      'http://schema.org/PostalAddress'
    ]);
  });

  test('finds an item with type defined twice', () => {
    var html =
      '<div itemscope itemtype="http://schema.org/Person http://schema.org/Person">' +
      '  hello' +
      '</div>';
    var result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].type).toEqual([
      'http://schema.org/Person'
    ]);
  });

  test('finds an item within an element', () => {
    var html =
      '<div>' +
      '  <div itemscope itemtype="http://schema.org/Person">hello</div>' +
      '</div>';
    var result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].type).toEqual(['http://schema.org/Person']);
  });

  test('finds multiple items within an element', () => {
    var html =
      '<div>' +
      '  <div itemscope itemtype="http://schema.org/Person">hello</div>' +
      '  <div itemscope itemtype="http://schema.org/PostalAddress">hello</div>' +
      '</div>';
    var result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.items[0].type).toEqual(['http://schema.org/Person']);
    expect(result.items[1].type).toEqual(['http://schema.org/PostalAddress']);
  });

  test('finds an item with properties', () => {
    var html =
      '<div itemscope itemtype="http://schema.org/Person">' +
      '  <div itemprop="name">Jan</div>' +
      '  <div><div itemprop="age">29</div></div>' +
      '</div>';
    var result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].properties).toEqual({
      name: ['Jan'],
      age: ['29']
    });
  });

  test('finds an item with childitems', () => {
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
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);

    expect(result.items[0].properties).toEqual({
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

  test('collates properties', () => {
    var html =
      '<div itemscope itemtype="http://schema.org/Person">' +
      '  <div itemprop="name">Jan</div>' +
      '  <div itemprop="name">Potoms</div>' +
      '</div>';
    var result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].properties).toEqual({
      name: ['Jan', 'Potoms']
    });
  });

  test('handles empty propertynames', () => {
    var html =
      '<div itemscope itemtype="http://schema.org/Person">' +
      '  <div itemprop="">Jan</div>' +
      '</div>';
    var result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].properties).toEqual({});
  });

  test('handles multiple propertynames', () => {
    var html =
      '<div itemscope itemtype="http://schema.org/Person">' +
      '  <div itemprop="name additionalName">Jan</div>' +
      '</div>';
    var result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].properties).toEqual({
      name: ['Jan'],
      additionalName: ['Jan']
    });
  });

  test('handles duplicated propertynames', () => {
    var html =
      '<div itemscope itemtype="http://schema.org/Person">' +
      '  <div itemprop="  name  name ">Jan</div>' +
      '</div>';
    var result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].properties).toEqual({
      name: ['Jan']
    });
  });

  test('finds top level items that are props in non-strict mode', () => {
    var html =
      '<div itemscope itemprop="someprop">' +
      '  <div itemprop="name">Jan</div>' +
      '  <div><div itemprop="age">29</div></div>' +
      '  <div itemprop="address" itemscope>' +
      '    <span itemprop="street">my street</span>' +
      '  </div>' +
      '</div>';
    var nonStrictResult = parser.toJson(html);
    expect(Array.isArray(nonStrictResult.items)).toBe(true);
    expect(nonStrictResult.items.length).toBe(1);
    expect(nonStrictResult.items[0].properties.name[0]).toBe('Jan');
    var strictResult = parser.toJson(html, { strict: true });
    expect(Array.isArray(strictResult.items)).toBe(true);
    expect(strictResult.items.length).toBe(0);
  });
});
