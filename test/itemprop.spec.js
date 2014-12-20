/* global describe, it */

'use strict';

var cheerio = require('cheerio'),
    assert  = require('chai').assert,
    parser  = require('..');

describe('itemprop', function () {

  it('handles <meta> elements', function () {
    var $ = cheerio.load(
      '<div itemscope>' +
      '  <meta itemprop="metaProp" content="  value ">' +
      '  <meta itemprop="metaProp">' +
      '</div>'
    );
    var result = parser.parse($);
    assert.deepEqual(result.items[0].properties, {
      metaProp: [ 'value', '' ]
    });
  });

  it('handles [src] elements', function () {
    var $ = cheerio.load(
      '<div itemscope>' +
      '  <audio itemprop="audioProp" src="./audio"></audio>' +
      '  <embed itemprop="embedProp" src="./embed"></embed>' +
      '  <iframe itemprop="iframeProp" src="./iframe"></iframe>' +
      '  <img itemprop="imgProp" src="./img"></img>' +
      '  <source itemprop="sourceProp" src="./source"></source>' +
      '  <track itemprop="trackProp" src="./track"></track>' +
      '  <video itemprop="videoProp" src="./video"></video>' +
      '  <audio itemprop="audioProp" src="http://www.absolute.com/audio"></audio>' +
      '  <embed itemprop="embedProp" src="http://www.absolute.com/embed"></embed>' +
      '  <iframe itemprop="iframeProp" src="http://www.absolute.com/iframe"></iframe>' +
      '  <img itemprop="imgProp" src="http://www.absolute.com/img"></img>' +
      '  <source itemprop="sourceProp" src="http://www.absolute.com/source"></source>' +
      '  <track itemprop="trackProp" src="http://www.absolute.com/track"></track>' +
      '  <video itemprop="videoProp" src="http://www.absolute.com/video"></video>' +
      '  <audio itemprop="audioProp"></audio>' +
      '  <embed itemprop="embedProp"></embed>' +
      '  <iframe itemprop="iframeProp"></iframe>' +
      '  <img itemprop="imgProp"></img>' +
      '  <source itemprop="sourceProp"></source>' +
      '  <track itemprop="trackProp"></track>' +
      '  <video itemprop="videoProp"></video>' +
      '</div>'
    );
    var result = parser.parse($, null, { base: 'http://www.example.com' });
    assert.deepEqual(result.items[0].properties, {
      audioProp: [ 
        'http://www.example.com/audio',
        'http://www.absolute.com/audio',
        ''
      ],
      embedProp: [ 
        'http://www.example.com/embed',
        'http://www.absolute.com/embed',
        ''
      ],
      iframeProp: [ 
        'http://www.example.com/iframe',
        'http://www.absolute.com/iframe',
        ''
      ],
      imgProp: [ 
        'http://www.example.com/img',
        'http://www.absolute.com/img',
        ''
      ],
      sourceProp: [ 
        'http://www.example.com/source',
        'http://www.absolute.com/source',
        ''
      ],
      trackProp: [ 
        'http://www.example.com/track',
        'http://www.absolute.com/track',
        ''
      ],
      videoProp: [ 
        'http://www.example.com/video',
        'http://www.absolute.com/video',
        ''
      ]
    });
  });

  it('handles [href] elements', function () {
    var $ = cheerio.load(
      '<div itemscope>' +
      '  <a itemprop="aProp" href="./a"></a>' +
      '  <link itemprop="linkProp" href="./link"></link>' +
      '  <area itemprop="areaProp" href="./area"></area>' +
      '  <a itemprop="aProp" href="http://www.absolute.com/a"></a>' +
      '  <link itemprop="linkProp" href="http://www.absolute.com/link"></link>' +
      '  <area itemprop="areaProp" href="http://www.absolute.com/area"></area>' +
      '  <a itemprop="aProp"></a>' +
      '  <link itemprop="linkProp"></link>' +
      '  <area itemprop="areaProp"></area>' +
      '</div>'
    );
    var result = parser.parse($, null, { base: 'http://www.example.com' });
    assert.deepEqual(result.items[0].properties, {
      aProp: [
        'http://www.example.com/a',
        'http://www.absolute.com/a',
        ''
      ],
      linkProp: [
        'http://www.example.com/link',
        'http://www.absolute.com/link',
        ''
      ],
      areaProp: [
        'http://www.example.com/area',
        'http://www.absolute.com/area',
        ''
      ]
    });
  });

  it('handles <object> elements', function () {
    var $ = cheerio.load(
      '<div itemscope>' +
      '  <object itemprop="objectProp" data="./object"></object>' +
      '  <object itemprop="objectProp" data="http://www.absolute.com/object"></object>' +
      '  <object itemprop="objectProp"></object>' +
      '</div>'
    );
    var result = parser.parse($, null, { base: 'http://www.example.com' });
    assert.deepEqual(result.items[0].properties, {
      objectProp: [
        'http://www.example.com/object',
        'http://www.absolute.com/object',
        ''
      ]
    });
  });

  it('handles [value] elements', function () {
    var $ = cheerio.load(
      '<div itemscope>' +
      '  <data itemprop="dataProp" value="  data-value "></data>' +
      '  <data itemprop="dataProp"></data>' +
      '  <meter itemprop="meterProp" value="  meter-value "></meter>' +
      '  <meter itemprop="meterProp"></meter>' +
      '</div>'
    );
    var result = parser.parse($, null, { base: 'http://www.example.com' });
    assert.deepEqual(result.items[0].properties, {
      dataProp: [ 'data-value', '' ],
      meterProp: [ 'meter-value', '' ]
    });
  });

  it('handles <time> elements', function () {
    var $ = cheerio.load(
      '<div itemscope>' +
      '  <time itemprop="timeProp" datetime="2014-01-01"></time>' +
      '  <time itemprop="timeProp"></time>' +
      '</div>'
    );
    var result = parser.parse($, null, { base: 'http://www.example.com' });
    assert.deepEqual(result.items[0].properties, {
      timeProp: [ '2014-01-01', '' ]
    });
  });

  it('handles text elements', function () {
    var $ = cheerio.load(
      '<div itemscope>' +
      '  <span itemprop="textProp">  Text value </span>' +
      '  <span itemprop="textProp">  </span>' +
      '</div>'
    );
    var result = parser.parse($, null, { base: 'http://www.example.com' });
    assert.deepEqual(result.items[0].properties, {
      textProp: [ 'Text value', '' ]
    });
  });

  it('handles absolute urls when no base is set', function () {
    var $ = cheerio.load(
      '<div itemscope>' +
      '  <a itemprop="property" href="http://www.example.com"></a>' +
      '</div>'
    );
    var result = parser.parse($, null, { base: undefined });
    assert.deepEqual(result.items[0].properties, {
      property: [ 'http://www.example.com/' ]
    });
  });

  it('handles base tag for url properties', function () {
    var $ = cheerio.load(
      '<!doctype html>' +
      '<head><base href="./base/"/></head>' +
      '<body itemscope>' +
      '  <a itemprop="property" href="./relative"></a>' +
      '</body>'
    );
    var result = parser.parse($, null, { base: 'http://www.example.com/' });
    assert.deepEqual(result.items[0].properties, {
      property: [ 'http://www.example.com/base/relative' ]
    });
  });

});
