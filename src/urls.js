const { URL } = require('url');

// resolves [url] to an absolute url. Potentially using [base] to resolve against
// returns empty string when it can't
/**
 * @param {string | undefined} url
 * @param {string | undefined} base
 * @returns {string}
 */
function tryResolve (url, base) {
  if (typeof url !== 'string') {
    return '';
  }
  try {
    return String(new URL(url));
  } catch (err) {
    if (!base) {
      return '';
    }
    try {
      return String(new URL(url, base));
    } catch (err) {
      return '';
    }
  }
}

exports.tryResolve = tryResolve;
