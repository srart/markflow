var fs = require('fs');
var s = fs.readFileSync('c:/Apps/markdown/app.js', 'utf8');

// Fix corrupted em-dash: Windows-1252 misread of UTF-8 E2 80 94
// appears as codepoints U+00E2 U+20AC U+201D
var emDashBad = '\u00e2\u20ac\u201d';
s = s.split(emDashBad).join('\u2014');

// Fix corrupted MarkFlow app title comment (â€" in header comment)
var commentBad = '\u00e2\u20ac\u201c';  // â€" (opening variant)
s = s.split(commentBad).join('\u2013');

// Fix &#10022; HTML entity -> actual Unicode star ✦
s = s.split('&#10022;').join('\u2726');

// Bump localStorage key so stale corrupt drafts are discarded
s = s.split('markflow_v3_draft').join('markflow_v4_draft');
s = s.split('markflow_v2_draft').join('markflow_v4_draft');

fs.writeFileSync('c:/Apps/markdown/app.js', s, 'utf8');

// Verify
var s2 = fs.readFileSync('c:/Apps/markdown/app.js', 'utf8');
console.log('v4 key at:', s2.indexOf('markflow_v4_draft'));
var qi = s2.indexOf('Keep it simple');
if (qi >= 0) console.log('quote line:', JSON.stringify(s2.slice(qi, qi + 50)));
var hi = s2.indexOf('Welcome to MarkFlow');
if (hi >= 0) console.log('title line:', JSON.stringify(s2.slice(hi, hi + 30)));
