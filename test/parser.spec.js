/* global describe, it */

'use strict';

var cheerio = require('cheerio'),
    assert  = require('chai').assert,
    parser  = require('..');

describe('parser', function () {

  it('finds no data when none defined', function () {
    var $ = cheerio.load('<div>hello</div>');
    var result = parser.parse($);
    assert.isArray(result);
    assert.lengthOf(result, 0);
  });

  it('finds an empty scope', function () {
    var $ = cheerio.load('<div itemscope>hello</div>');
    var result = parser.parse($);
    assert.isArray(result);
    assert.lengthOf(result, 1);
    assert.isObject(result[0]);
    assert.isNull(result[0].type);
    assert.isObject(result[0].props);
    assert.lengthOf(result[0].children, 0);
  });

  it('finds a scope with a type', function () {
    var $ = cheerio.load('<div itemscope itemtype="http://schema.org/Person">hello</div>');
    var result = parser.parse($);
    assert.isArray(result);
    assert.lengthOf(result, 1);
    assert.strictEqual(result[0].type, 'http://schema.org/Person');
  });

  it('finds a scope within an element', function () {
    var $ = cheerio.load('<div><div itemscope itemtype="http://schema.org/Person">hello</div></div>');
    var result = parser.parse($);
    assert.isArray(result);
    assert.lengthOf(result, 1);
    assert.strictEqual(result[0].type, 'http://schema.org/Person');
  });

  it('finds multiple scopes within an element', function () {
    var $ = cheerio.load(
      '<div>' +
      '<div itemscope itemtype="http://schema.org/Person">hello</div>' +
      '<div itemscope itemtype="http://schema.org/PostalAddress">hello</div>' +
      '</div>'
    );
    var result = parser.parse($);
    assert.isArray(result);
    assert.lengthOf(result, 2);
    assert.strictEqual(result[0].type, 'http://schema.org/Person');
    assert.strictEqual(result[1].type, 'http://schema.org/PostalAddress');
  });

  it('finds a scope with properties', function () {
    var $ = cheerio.load(
      '<div itemscope itemtype="http://schema.org/Person">' +
      '<div itemprop="name">Jan</div>' +
      '<div><div itemprop="age">29</div></div>' +
      '</div>'
    );
    var result = parser.parse($);
    assert.isArray(result);
    assert.lengthOf(result, 1);
    assert.deepEqual(result[0].props, {
      name: 'Jan',
      age: '29'
    });
  });

  it('finds a scope with childscopes', function () {
    var $ = cheerio.load(
      '<div itemscope itemtype="http://schema.org/Person">' +
      '<div itemscope itemtype="http://schema.org/PostalAddress">' +
      '<div itemprop="street">street1</div>' +
      '</div>' +
      '<div itemscope itemtype="http://schema.org/PostalAddress">' +
      '<div itemprop="street">street2</div>' +
      '</div>' +
      '</div>'
    );
    var result = parser.parse($);
    assert.isArray(result);
    assert.lengthOf(result, 1);
    assert.lengthOf(result[0].children, 2);
    assert.deepEqual(result[0].children[0].props, { street: 'street1' });
    assert.deepEqual(result[0].children[1].props, { street: 'street2' });
  });

  it('collates properties', function () {
    var $ = cheerio.load(
      '<div itemscope itemtype="http://schema.org/Person">' +
      '<div itemprop="name">Jan</div>' +
      '<div itemprop="name">Potoms</div>' +
      '</div>'
    );
    var result = parser.parse($);
    assert.isArray(result);
    assert.lengthOf(result, 1);
    assert.deepEqual(result[0].props, {
      name: ['Jan', 'Potoms']
    });
  });

});
