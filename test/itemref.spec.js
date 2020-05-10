/* eslint-env jest */

const parser = require('../src');

describe('itemref', () => {
  test('parses itemrefs', () => {
    const html =
      '<div>' +
      '  <div id="ref1">' +
      '    <div itemprop="name">Jan</div>' +
      '  </div>' +
      '  <div id="ref2" itemprop="name">Potoms</div>' +
      '  <div itemscope itemtype="http://schema.org/Person" itemref="ref1 ref2"></div>' +
      '</div>';
    const result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].properties).toEqual({
      name: ['Jan', 'Potoms']
    });
  });

  test('parses multiple items with the same ref', () => {
    const html =
      '<div id="ref" itemprop="name">Jan</div>' +
      '<div itemscope itemtype="http://schema.org/Person" itemref="ref"></div>' +
      '<div itemscope itemtype="http://schema.org/Person" itemref="ref"></div>';
    const result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.items[0].properties).toEqual({
      name: ['Jan']
    });
    expect(result.items[1].properties).toEqual({
      name: ['Jan']
    });
  });

  test.skip('parses nested reffed items', function () {
    const html =
      '<div itemscope itemid="#item1">' +
      '  <div id="ref" itemprop="property1" itemscope itemid="#sub-item1"></div>' +
      '  <div itemprop="property2" itemscope itemref="ref" itemid="#sub-item2">' +
      '  </div>' +
      '</div>';
    const result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result).toHaveProperty('.items[0].properties.property1[0].id', '#sub-item1');
    expect(result).toHaveProperty('.items[0].properties.property2[0].id', '#sub-item2');
    expect(result).toHaveProperty(
      '.items[0].properties.property2[0].properties.property1[0].id',
      '#sub-item1'
    );
  });

  test('handle top-level circular structure', () => {
    const html =
      '<div id="ref">' +
      '  <div itemscope itemref="ref">' +
      '    <div itemprop="name">Jan</div>' +
      '  </div>' +
      '</div>';
    const result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].properties).toEqual({
      name: ['Jan']
    });
  });

  test('handle nested item circular structure', () => {
    const html =
      '<div itemscope>' +
      '  <div id="ref">' +
      '    <div itemprop="name">Jan</div>' +
      '    <div itemprop="friend" itemscope>' +
      '      <div itemprop="name">Other Jan</div>' +
      '      <div itemprop="friend" itemscope itemref="ref"></div>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    const result = parser.toJson(html);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].properties).toEqual({
      name: ['Jan'],
      friend: [{
        properties: {
          name: ['Other Jan'],
          friend: ['ERROR']
        }
      }]
    });
  });
});
