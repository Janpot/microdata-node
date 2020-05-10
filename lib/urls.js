// resolves [url] to an absolute url. Potentially using [base] to resolve against
// returns empty string when it can't
function tryResolve (url, base) {
  try {
    if (typeof url !== 'string') {
      return '';
    }
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

module.exports = {
  tryResolve
};
