/* eslint-env jest */

const parser = require('../src');

describe('itemprop', () => {
  test('handles <meta> elements', () => {
    const html =
      '<div itemscope>' +
      '  <meta itemprop="metaProp" content="  value ">' +
      '  <meta itemprop="metaProp">' +
      '</div>';
    const result = parser.toJson(html);
    expect(result.items[0].properties).toEqual({
      metaProp: ['  value ', '']
    });
  });

  test('handles [src] elements', () => {
    const html =
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
      '</div>';
    const result = parser.toJson(html, { base: 'http://www.example.com' });
    expect(result.items[0].properties).toEqual({
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

  test('handles [src] elements with invalid base option', () => {
    const html =
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
      '</div>';
    const result = parser.toJson(html, { base: 'invalid url' });
    expect(result.items[0].properties).toEqual({
      audioProp: [
        '',
        'http://www.absolute.com/audio',
        ''
      ],
      embedProp: [
        '',
        'http://www.absolute.com/embed',
        ''
      ],
      iframeProp: [
        '',
        'http://www.absolute.com/iframe',
        ''
      ],
      imgProp: [
        '',
        'http://www.absolute.com/img',
        ''
      ],
      sourceProp: [
        '',
        'http://www.absolute.com/source',
        ''
      ],
      trackProp: [
        '',
        'http://www.absolute.com/track',
        ''
      ],
      videoProp: [
        '',
        'http://www.absolute.com/video',
        ''
      ]
    });
  });

  test('handles [href] elements', () => {
    const html =
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
      '</div>';
    const result = parser.toJson(html, { base: 'http://www.example.com' });
    expect(result.items[0].properties).toEqual({
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

  test('handles <object> elements', () => {
    const html =
      '<div itemscope>' +
      '  <object itemprop="objectProp" data="./object"></object>' +
      '  <object itemprop="objectProp" data="http://www.absolute.com/object"></object>' +
      '  <object itemprop="objectProp"></object>' +
      '</div>';
    const result = parser.toJson(html, { base: 'http://www.example.com' });
    expect(result.items[0].properties).toEqual({
      objectProp: [
        'http://www.example.com/object',
        'http://www.absolute.com/object',
        ''
      ]
    });
  });

  test('handles [value] elements', () => {
    const html =
      '<div itemscope>' +
      '  <data itemprop="dataProp" value="  data-value "></data>' +
      '  <data itemprop="dataProp"></data>' +
      '  <meter itemprop="meterProp" value="  meter-value "></meter>' +
      '  <meter itemprop="meterProp"></meter>' +
      '</div>';
    const result = parser.toJson(html, { base: 'http://www.example.com' });
    expect(result.items[0].properties).toEqual({
      dataProp: ['  data-value ', ''],
      meterProp: ['  meter-value ', '']
    });
  });

  test('handles <time> elements', () => {
    const html =
      '<div itemscope>' +
      '  <time itemprop="timeProp" datetime="2014-01-01"></time>' +
      '  <time itemprop="timeProp"></time>' +
      '</div>';
    const result = parser.toJson(html, { base: 'http://www.example.com' });
    expect(result.items[0].properties).toEqual({
      timeProp: ['2014-01-01', '']
    });
  });

  test('handles text elements', () => {
    const html =
      '<div itemscope>' +
      '  <span itemprop="textProp">  Text value </span>' +
      '  <span itemprop="textProp">  </span>' +
      '</div>';
    const result = parser.toJson(html, { base: 'http://www.example.com' });
    expect(result.items[0].properties).toEqual({
      textProp: ['  Text value ', '  ']
    });
  });

  test('handles absolute urls when no base is set', () => {
    const html =
      '<div itemscope>' +
      '  <a itemprop="property" href="http://www.example.com"></a>' +
      '</div>';
    const result = parser.toJson(html, { base: undefined });
    expect(result.items[0].properties).toEqual({
      property: ['http://www.example.com']
    });
  });

  test('handles base tag for url properties', () => {
    // should also ignore the first empty base tag!
    const html =
      '<!doctype html>' +
      '<head><base/><base href="./base/"/><base href="./other-base/"/></head>' +
      '<body itemscope>' +
      '  <a itemprop="property" href="./relative"></a>' +
      '</body>';
    const result = parser.toJson(html, { base: 'http://www.example.com/' });
    expect(result.items[0].properties).toEqual({
      property: ['http://www.example.com/base/relative']
    });
  });

  test('handles malformed content attribs in non-strict mode', () => {
    const html =
      '<div itemscope>' +
      '  <span itemprop="ratingValue" content="4.5" ></span>' +
      '  <span itemprop="reviewCount" content="3018" ></span>' +
      '</div>';

    const strictResult = parser.toJson(html, { strict: true });
    expect(strictResult.items[0].properties).toEqual({
      ratingValue: ['4.5'],
      reviewCount: ['3018']
    });

    const nonStrictResult = parser.toJson(html);
    expect(nonStrictResult.items[0].properties).toEqual({
      ratingValue: ['4.5'],
      reviewCount: ['3018']
    });
  });
});
