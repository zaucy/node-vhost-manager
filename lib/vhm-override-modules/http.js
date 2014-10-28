var http = require("http");
var vhmHttpModule = Object.create(http);

vhmHttpModule.Server.prototype.listen = function(port, callback) {
	if(port == 80) {
		
		global.vhmHttpServers[module.hostname] = this;
		
		if(typeof callback == "function") {
			process.nextTick(function() {
				callback(global.vhmHttpServerListener);
			}.bind(global.vhmHttpServer));
		}
		return global.vhmHttpServerListener;
	}
	
	return http.Server.prototype.listen.apply(this, arguments);
};

module.exports = vhmHttpModule;