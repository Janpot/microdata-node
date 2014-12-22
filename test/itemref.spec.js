/* global describe, it */

'use strict';

var cheerio = require('cheerio'),
    assert  = require('chai').assert,
    parser  = require('..');

describe('itemref', function () {

  it('parses itemrefs', function () {
    var $ = cheerio.load(
      '<div id="ref1">' +
      '  <div itemprop="name">Jan</div>' +
      '</div>' +
      '<div id="ref2" itemprop="name">Potoms</div>' +
      '<div itemscope itemtype="http://schema.org/Person" itemref="ref1 ref2"></div>'
    );
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].properties, {
      name: ['Jan', 'Potoms']
    });
  });

  it('parses multiple items with the same ref', function () {
    var $ = cheerio.load(
      '<div id="ref" itemprop="name">Jan</div>' +
      '<div itemscope itemtype="http://schema.org/Person" itemref="ref"></div>' +
      '<div itemscope itemtype="http://schema.org/Person" itemref="ref"></div>'
    );
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 2);
    assert.deepEqual(result.items[0].properties, {
      name: ['Jan']
    });
    assert.deepEqual(result.items[1].properties, {
      name: ['Jan']
    });
  });

  it('parses nested reffed items', function () {
    var $ = cheerio.load(
      '<div itemscope itemid="#item1">' +
      '  <div id="ref" itemprop="property1" itemscope itemid="#sub-item1"></div>' +
      '  <div itemprop="property2" itemscope itemref="ref" itemid="#sub-item2">' +
      '  </div>' +
      '</div>'
    );
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepPropertyVal(
      result, '.items[0].properties.property1[0].id', '#sub-item1');
    assert.deepPropertyVal(
      result, '.items[0].properties.property2[0].id', '#sub-item2');
    assert.deepPropertyVal(
      result, '.items[0].properties.property2[0].properties.property1[0].id', '#sub-item1');
  });

  it('handle top-level circular structure', function () {
    var $ = cheerio.load(
      '<div id="ref">' +
      '  <div itemscope itemref="ref">' +
      '    <div itemprop="name">Jan</div>' +
      '  </div>' +
      '</div>'
    );
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].properties, {
      name: ['Jan']
    });
  });

  it('handle nested item circular structure', function () {
    var $ = cheerio.load(
      '<div itemscope>' +
      '  <div id="ref">' +
      '    <div itemprop="name">Jan</div>' +
      '    <div itemprop="friend" itemscope>' +
      '      <div itemprop="name">Other Jan</div>' +
      '      <div itemprop="friend" itemscope itemref="ref"></div>' +
      '    </div>' +
      '  </div>' +
      '</div>'
    );
    var result = parser.parse($);
    assert.isArray(result.items);
    assert.lengthOf(result.items, 1);
    assert.deepEqual(result.items[0].properties, {
      name: [ 'Jan' ],
      friend: [{
        properties: {
          name: [ 'Other Jan' ],
          friend: [{
            properties: {
              friend: [ 'ERROR' ],
              name: [ 'Jan' ]
            }
          }]
        }
      }]
    });
  });

});
