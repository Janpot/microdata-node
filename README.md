microdata-node
==============

[![Build Status](https://travis-ci.org/Janpot/microdata-node.svg)](https://travis-ci.org/Janpot/microdata-node)

Cheerio based microdata parser. Aims to be compatible with http://www.w3.org/TR/microdata/#json.

Demo over at http://janpot.github.io/microdata-node.

## Example:

```js
var cheerio = require('cheerio');
var microdata = require('microdata-node');

var $ = cheerio.load(
  '<section itemscope itemtype="http://schema.org/Person"> ' +
  '  Hello, my name is ' +
  '  <span itemprop="name">John Doe</span>, ' +
  '  I am a ' +
  '  <span itemprop="jobTitle">graduate research assistant</span> ' +
  '  at the ' +
  '  <span itemprop="affiliation">University of Dreams</span>. ' +
  '  My friends call me ' +
  '  <span itemprop="additionalName">Johnny</span>. ' +
  '  You can visit my homepage at ' +
  '  <a href="http://www.JohnnyD.com" itemprop="url">www.JohnnyD.com</a>. ' +
  '  <section itemprop="address" itemscope itemtype="http://schema.org/PostalAddress">' +
  '    I live at ' +
  '    <span itemprop="streetAddress">1234 Peach Drive</span>,' +
  '    <span itemprop="addressLocality">Warner Robins</span>,' +
  '    <span itemprop="addressRegion">Georgia</span>.' +
  '  </section>' +
  '</section>'
);

var result = microdata.parse($, null, {
  base: 'http://www.example.com'
});
console.log(JSON.stringify(result, null, 2));
```

Output:

```json
{
  "items": [
    {
      "type": [ "http://schema.org/Person" ],
      "properties": {
        "name": [ "John Doe" ],
        "jobTitle": [ "graduate research assistant" ],
        "affiliation": [ "University of Dreams" ],
        "additionalName": [ "Johnny" ],
        "url": [ "http://www.johnnyd.com/" ],
        "address": [
          {
            "type": [ "http://schema.org/PostalAddress" ],
            "properties": {
              "streetAddress": [ "1234 Peach Drive" ],
              "addressLocality": [ "Warner Robins" ],
              "addressRegion": [ "Georgia" ]
            }
          }
        ]
      }
    }
  ]
}
```

## API

    microdata.parse($, [$nodes], [config])

parses the provided cheerio object with optional configuration.

Optionally specify a subset of nodes to parse. Can be obtained by `$('.nodes-to-parse')`.

`config.base`: base url to resolve url properties against.
