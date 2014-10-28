const
	// current issue with vhost-manager, http must be required before any library
	// such as express that uses http internally.
	http = require("http"),
	express = require("express"),
	fs = require("fs")
	mime = require("mime");

var server = express();
server.listen(80);

server.get("/style.css", function(req, res) {
	fs.readFile(__dirname + "/style.css", function(err, data) {
		if(err) { res.end(err); return }
		
		res.writeHead(200, {
			"Content-Type": mime.lookup(".css"),
			"Content-Length": data.length
		});
		
		res.end(data);
	});
});

server.use(function(req, res) {
	var content = "<!DOCTYPE html><html><head><link rel=\"stylesheet\" type=\"text/css\" href=\"/style.css\"></head><body><h2>Node VHost Manager works!</h2><h4>["+req.headers.host+"] "+req.method+" "+req.url+"</h4></body></html>";
	
	res.writeHead(200, {
		"Content-Type": "text/html",
		"Content-Length": content.length
	});
	
	res.end(content);
});