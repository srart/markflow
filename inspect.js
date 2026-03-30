var fs = require('fs');
var s = fs.readFileSync('c:/Apps/markdown/app.js', 'utf8');
var i = s.indexOf('Keep it simple');
var chunk = s.slice(i, i + 60);
console.log('text:', JSON.stringify(chunk));
// show char codes
for (var j = 0; j < chunk.length; j++) {
  process.stdout.write(chunk.charCodeAt(j).toString(16).padStart(4,'0') + ' ');
}
console.log();
