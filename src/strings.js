// splits a string on whitespaces and removes duplicate values
function splitUnique (string) {
  string = string && string.trim();
  if (string) {
    return Array.from(new Set((string.split(/\s+/))));
  } else {
    return [];
  }
}

exports.splitUnique = splitUnique;
