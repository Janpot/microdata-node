microdata-node
==============

[![Build Status](https://travis-ci.org/Janpot/microdata-node.svg)](https://travis-ci.org/Janpot/microdata-node)

Microdata parser. Aims to be compatible with http://www.w3.org/TR/microdata/#json and http://www.w3.org/TR/microdata-rdf/

Demo over at http://janpot.github.io/microdata-node.

## Example:

```js
var microdata = require('microdata-node');

var html =
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
  '</section>';

var json = microdata.toJson(html, {
  base: 'http://www.example.com'
});
console.log(JSON.stringify(json, null, 2));
/*
{
  "items": [{
    "properties": {
      "address": [{
        "properties": {
          "addressRegion": [ "Georgia" ],
          "addressLocality": [ "Warner Robins" ],
          "streetAddress": [ "1234 Peach Drive" ]
        },
        "type": [ "http://schema.org/PostalAddress" ]
      }],
      "url": [ "http://www.JohnnyD.com" ],
      "additionalName": [ "Johnny" ],
      "affiliation": [ "University of Dreams" ],
      "jobTitle": [ "graduate research assistant" ],
      "name": [ "John Doe" ]
    },
    "type": [ "http://schema.org/Person" ]
  }]
}
*/

var jsonld = microdata.toJsonld(html, {
  base: 'http://www.example.com'
});
console.log(JSON.stringify(jsonld, null, 2));
/*
[{
  "@id": "_:0",
  "@type": [ "http://schema.org/Person" ],
  "http://schema.org/address": [{ "@id": "_:1" }],
  "http://schema.org/url": [{ "@id": "http://www.JohnnyD.com" }],
  "http://schema.org/additionalName": [{ "@value": "Johnny" }],
  "http://schema.org/affiliation": [{ "@value": "University of Dreams" }],
  "http://schema.org/jobTitle": [{ "@value": "graduate research assistant" }],
  "http://schema.org/name": [{ "@value": "John Doe" }]
}, {
  "@id": "_:1",
  "@type": [ "http://schema.org/PostalAddress" ],
  "http://schema.org/addressRegion": [{ "@value": "Georgia" }],
  "http://schema.org/addressLocality": [{ "@value": "Warner Robins" }],
  "http://schema.org/streetAddress": [{ "@value": "1234 Peach Drive" }]
}]
*/
```

## API

    microdata.toJson(html, [config])

parses the provided html to [microdata json](http://www.w3.org/TR/microdata/#json)

    microdata.toJsonld(html, [config])

parses the provided html to [jsonld](http://json-ld.org/)


**options**

`config.base`: Base url to resolve url properties against.
`config.registry`: The [registry](http://www.w3.org/TR/microdata-rdf/#dfn-registry) associates a URI prefix with one or more key-value pairs denoting processor behavior.
`config.useRdfType`: (default `false`) If set to true, `rdf:type` predicates won't be converted to `@type` properties.
`config.strict`: (default `false`) Parse strictly according to spec. Does not try to be forgiving of malformed microdata.
`config.useNativeTypes`: (default `true`) Converts literals that are numbers or booleans to their corresponding JSOn type.

