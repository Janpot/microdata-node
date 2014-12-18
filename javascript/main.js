var cheerio = require('cheerio'),
    microdata = require('microdata-node');

var fs = require('fs');

var $htmlTextArea = $('#to-parse-html');
var $outputPane = $('#output');
var $baseUrlInput = $('#base-url-input');

var example = fs.readFileSync(__dirname + '/example.html', 'utf8');
$htmlTextArea.val(example);

function parseContent() {
  var toParse = $htmlTextArea.val();
  var baseUrl = $baseUrlInput.val();
  var $ = cheerio.load(toParse);
  var parsed = microdata.parse($, null, {
    base: baseUrl
  });
  $outputPane.text(JSON.stringify(parsed, null, 2));
}

$htmlTextArea.on('change', parseContent);
$baseUrlInput.on('change', parseContent);
parseContent();
