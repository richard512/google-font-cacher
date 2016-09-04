var fs = require('fs');
var css = require('css');
var path = require('path');
var https = require('https');
fontfaces = [];

var download = function(srcurl, destfile, cb) {
  var file = fs.createWriteStream(destfile);
  var request = https.get(srcurl, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb(srcurl, destfile, false));  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(destfile); // Delete the file async. (But we don't check the result)
    if (cb) cb(srcurl, destfile, err.message);
  });
}

function parseFontCSS(){
	language = 'latin'
	for (ruleindex in obj.stylesheet.rules) {
		rule = obj.stylesheet.rules[ruleindex]
		if (rule.type == 'comment') {
			language = rule.comment.trim()
		} if (rule.type == 'font-face') {
			family = ''
			style = ''
			weight = ''
			url = ''
			format = ''
			unirange = ''
			for (decindex in rule.declarations) {
				dec = rule.declarations[decindex]

				switch (dec.property) {
					case 'font-family':
						family = dec.value.replace(/\'/g, '').replace(/ /g, '-')
						break;
					case 'font-style':
						style = dec.value
						break;
					case 'font-style':
						style = dec.value
						break;
					case 'font-weight':
						weight = dec.value
						break;
					case 'src':
						maybeurl = dec.value.match(/url\(([^\)\()]*)\)/)
						if (maybeurl) {
							url = maybeurl[1]
						}
						maybeformat = dec.value.match(/format\([\'\"]([^\)\()]*)[\'\"]\)/)
						if (maybeformat) {
							format = maybeformat[1]
						}
						break;
					case 'unicode-range':
						unirange = dec.value
						break;
				}
				//console.log(dec.property +' = '+dec.value)
				/*
				if (dec.type == 'declaration' && dec.property) {
					console.log('Found a Font: ')
					console.log(rule.declarations)
				*/
			}

			if (!fs.existsSync(outputdir+family+'/')) {
				fs.mkdir(outputdir+family+'/')
			}

			newfilename = family+'-'+language+'.'+format
			font = {
				newfilename: newfilename,
				url: url,			
				}
			fontfaces.push(font)
			language = ''

			download(url, outputdir+family+'/'+newfilename, function(srcurl, destfile, err) {
				if (err) { 
					console.log("ERROR: "+err)
				} else {
					console.log('Downloaded font: '+destfile)
				}
			})
		}
	}

	console.log(fontfaces)
	makeTestPage(family, inputcss, newfilename)
}

function gup( name, url ) {
	/*
	usage: gup('q', 'hxxp://example.com/?q=abc')
	*/
	if (!url) url = location.href;
	name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	var regexS = "[\\?&]"+name+"=([^&#]*)";
	var regex = new RegExp( regexS );
	var results = regex.exec( url );
	return results == null ? null : results[1];
}

function downloadFontCSS(fonturl) {
	var fontfam = gup('family', fonturl)
	
	if (fontfam) {
		console.log("Font Family to Download: "+fontfam);

		inputdir = 'input/'
		outputdir = 'output/'

		if (!fs.existsSync(inputdir)) {
			fs.mkdir(inputdir)
		}

		if (!fs.existsSync(outputdir)) {
			fs.mkdir(outputdir)
		}
		
		download(fonturl, inputdir+fontfam, function(srcurl, destfile, err) {
			if (err) { 
				console.log("ERROR: "+err)
			} else {
				console.log('Downloaded CSS: '+destfile)
				inputcss = String(fs.readFileSync(inputdir+'/'+fontfam))
				obj = css.parse(inputcss);

				parseFontCSS()
			}
		})
	}
}

function makeTestPage(fontname, css, fontfile) {
	html = '<title>'+fontname+'</title>\n'
	html = '<style type="text/css">\n'
	html+= '/* latin */\n'
	html+= '@font-face {\n'
	html+= '  font-family: "'+fontname+'";\n'
	html+= '  font-style: normal;\n'
	html+= '  font-weight: 400;\n'
	html+= '  src: local("'+fontname+'"), local("'+fontname+'"), url('+fontfile+') format("woff2");\n'
	html+= '  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2212, U+2215, U+E0FF, U+EFFD, U+F000;\n'
	html+= '}\n'
	html+= '</style>\n'
	html+= '<h1 style="font-family: \''+fontname+'\'">'+fontname+'</h1>'
	htmlfilename = 'output/'+fontname+'/index.htm'
	fs.writeFileSync(htmlfilename, html, 'utf8');
	console.log('Created font test file: '+htmlfilename)
}

if (process.argv[2]) {
	fonturl = process.argv[2]
	if (fonturl.match('^http')) {
		downloadFontCSS(fonturl);
	} else {
		console.log('Usage: nodejs '+path.basename(process.argv[1])+' https://fonts.googleapis.com/css?family=Open+Sans')
	}
}