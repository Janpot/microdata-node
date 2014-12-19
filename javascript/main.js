
var $htmlTextArea = $('#editor');
var $outputPane = $('#output');
var $baseUrlInput = $('#base-url-input');

var editorContainer = document.getElementById('editor');
var editor = new CodeMirror(editorContainer, {
  value: example,
  mode: 'htmlmixed'
});
editor.setSize(null, '100%');

function parseContent() {
  var toParse = editor.getDoc().getValue();
  var baseUrl = $baseUrlInput.val();
  var $ = cheerio.load(toParse);
  var parsed = microdata.parse($, null, {
    base: baseUrl
  });

  $outputPane.JSONView(parsed);
}

editor.getDoc().on('change', parseContent);
$baseUrlInput.on('keyup change', parseContent);
parseContent();
