'use strict';

function tokenize (string) {
  function combine (/* patterns */) {
    var regexStr = Array.prototype.slice.call(arguments, 0)
      .map(function (pattern) {
        if (pattern instanceof RegExp) {
          return pattern.source;
        }
        return pattern.replace(/\\/g, '\\\\');
      })
      .join('');
    return new RegExp(regexStr);
  }

  var OPEN_BRACE = /\[/;
  var CLOSE_BRACE = /\]/;
  var OPEN_PAREN = /\(/;
  var CLOSE_PAREN = /\)/;
  var TYPE_DELIM = /\^\^/;
  var DOT = /\./;
  var PREFIX_ID = /@prefix/;
  var BASE_ID = /@base/;
  var SPARQL_PREFIX_ID = /PREFIX/;
  var SPARQL_BASE_ID = /BASE/;
  var BOOL_TRUE = /true/;
  var BOOL_FALSE = /false/;
  var PN_LOCAL_ESC = /\\[-_~.!$&'()*+,;=/?#@%]/;
  var HEX = /[0-9A-Fa-f]/;
  var PERCENT = combine(/%/, HEX, HEX);
  var PLX = combine(PERCENT, '|', PN_LOCAL_ESC);
  var PN_CHARS_BASE = /[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u10000-\uEFFFF]/;
  var PN_CHARS_U = combine(PN_CHARS_BASE, '|_');
  var PN_CHARS = combine(PN_CHARS_U, '|', /[-0-9\u00B7\u0300-\u036F\u203F-\u2040]/);
  var PN_PREFIX = combine(PN_CHARS_BASE, '(?:(?:', PN_CHARS, '|', /\./, ')*', PN_CHARS, ')?');
  var PN_LOCAL = combine('(?:', PN_CHARS_U, '|:|[0-9]|', PLX, ')(?:(?:', PN_CHARS, '|', /\./, '|:|', PLX, ')*(?:', PN_CHARS, '|:|', PLX, '))?');
  var WS = /[\x20\x9\xD\xA]/;
  var ANON = combine(/\[/, WS, '*', /\]/);
  var ECHAR = /\\[tbnrf"'\\]/;
  var UCHAR = combine(/\\u/, HEX, HEX, HEX, HEX, '|', /\\U/, HEX, HEX, HEX, HEX, HEX, HEX, HEX, HEX);
  var STRING_LITERAL_LONG_QUOTE = combine(/"""/, '(?:(?:', /"|""/, ')?', '(', /[^"\\]/, '|', ECHAR, '|', UCHAR, '))*', /"""/);
  var STRING_LITERAL_LONG_SINGLE_QUOTE = combine(/'''/, '(?:(?:', /'|''/, ')?', '(?:', /[^'\\]/, '|', ECHAR, '|', UCHAR, '))*', /'''/);
  // eslint-disable-next-line no-control-regex
  var STRING_LITERAL_SINGLE_QUOTE = combine(/'/, '(?:', /[^\x22\x5C\x0A\x0D]/, '|', ECHAR, '|', UCHAR, ')*', /'/);
  // eslint-disable-next-line no-control-regex
  var STRING_LITERAL_QUOTE = combine(/"/, '(?:', /[^\x22\x5C\x0A\x0D]/, '|', ECHAR, '|', UCHAR, ')*', /"/);
  var EXPONENT = /[eE][+-]?[0-9]+/;
  var DOUBLE = combine(/[+-]?/, '(?:', /[0-9]+\.[0-9]*/, EXPONENT, '|', /\.[0-9]+/, EXPONENT, '|', /[0-9]+/, EXPONENT, ')');
  var DECIMAL = /[+-]?[0-9]*\.[0-9]+/;
  var INTEGER = /[+-]?[0-9]+/;
  var LANGTAG = /@[a-zA-Z]+(?:-[a-zA-Z0-9]+)*/;
  var BLANK_NODE_LABEL = combine(/_:/, '(?:', PN_CHARS_U, '|', /[0-9]/, ')(?:(?:', PN_CHARS, '|', /\./, ')*', PN_CHARS, ')?');
  var PNAME_NS = combine('(?:', PN_PREFIX, ')?:');
  var PNAME_LN = combine(PNAME_NS, PN_LOCAL);
  // eslint-disable-next-line no-control-regex
  var IRIREF = combine(/</, '(', /[^\x00-\x20<>"{}|^`\\]/, ')*', />/);

  var terminalBaseRe = {
    OPEN_BRACE: OPEN_BRACE,
    CLOSE_BRACE: CLOSE_BRACE,
    OPEN_PAREN: OPEN_PAREN,
    CLOSE_PAREN: CLOSE_PAREN,
    TYPE_DELIM: TYPE_DELIM,
    DOT: DOT,
    PREFIX_ID: PREFIX_ID,
    BASE_ID: BASE_ID,
    SPARQL_PREFIX_ID: SPARQL_PREFIX_ID,
    SPARQL_BASE_ID: SPARQL_BASE_ID,
    BOOL_TRUE: BOOL_TRUE,
    BOOL_FALSE: BOOL_FALSE,
    IRIREF: IRIREF,
    PNAME_NS: PNAME_NS,
    PNAME_LN: PNAME_LN,
    BLANK_NODE_LABEL: BLANK_NODE_LABEL,
    LANGTAG: LANGTAG,
    INTEGER: INTEGER,
    DECIMAL: DECIMAL,
    DOUBLE: DOUBLE,
    EXPONENT: EXPONENT,
    STRING_LITERAL_QUOTE: STRING_LITERAL_QUOTE,
    STRING_LITERAL_SINGLE_QUOTE: STRING_LITERAL_SINGLE_QUOTE,
    STRING_LITERAL_LONG_SINGLE_QUOTE: STRING_LITERAL_LONG_SINGLE_QUOTE,
    STRING_LITERAL_LONG_QUOTE: STRING_LITERAL_LONG_QUOTE,
    UCHAR: UCHAR,
    ECHAR: ECHAR,
    WS: WS,
    ANON: ANON,
    PN_CHARS_BASE: PN_CHARS_BASE,
    PN_CHARS_U: PN_CHARS_U,
    PN_CHARS: PN_CHARS,
    PN_PREFIX: PN_PREFIX,
    PN_LOCAL: PN_LOCAL,
    PLX: PLX,
    PERCENT: PERCENT,
    HEX: HEX,
    PN_LOCAL_ESC: PN_LOCAL_ESC
  };

  var terminalRe = Object.keys(terminalBaseRe)
    .reduce(function (terminalRe, name) {
      var pattern = terminalBaseRe[name].source;
      terminalRe[name] = new RegExp('^' + pattern, '');
      return terminalRe;
    }, {});

  function longestMatch (string) {
    return Object.keys(terminalRe)
      .reduce(function (longestToken, name) {
        var match = terminalRe[name].exec(string);
        if (match) {
          var value = match[0];
          if (!longestToken || value.length > longestToken.value.length) {
            return { name: name, value: value };
          }
        }

        return longestToken;
      }, null);
  }

  var tokens = [];
  string = string.trim();
  while (string) {
    var token = longestMatch(string);
    if (!token) {
      throw new Error('Invalid token');
    }
    tokens.push(token);
    string = string.substring(token.value.length).trim();
  }

  return tokens;
}

module.exports = tokenize;
