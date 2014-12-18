var cheerio = require('cheerio'),
    microdata = require('microdata-node');

var fs = require('fs');

var $htmlTextArea = $('#to-parse-html');
var $outputPane = $('#output');

var example = fs.readFileSync(__dirname + '/example.html', 'utf8');
$htmlTextArea.val(example);

function parseContent() {
  var toParse = $htmlTextArea.val();
  var $ = cheerio.load(toParse);
  var parsed = microdata.parse($);
  $outputPane.text(JSON.stringify(parsed, null, 2));
}

$htmlTextArea.on('change', parseContent);
parseContent();
