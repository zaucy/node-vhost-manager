var fs = require("fs-extra")
  , npm = require("npm")
	, path = require("path")
	, http = require("http");

var requireWithImports = require(__dirname + "/require-with-imports.js");
	
var Module = module.constructor;
var ImportableModule = require("importable-module");

var defaultHostSettings = JSON.parse(fs.readFileSync(__dirname + "/default-host.json"));

var defaultVhostManagerSettings = {
	"hostsDirectory": process.cwd() + "/hosts",
	"hostFilename": "host.json",
	"developerMode": false
};

var vhostManagerSettings = Object.create(defaultVhostManagerSettings);

(function() {
	
	var pathIsAbsolute = function(p) {
		return path.resolve(p) == path.normalize(p);
	};
	
	var argFuncs = {
		"--help": function() {
			console.log("Usage: node-vhost-manager [--setting=<val>,] [settings file name]");
			console.log();
			console.log("    By default node-vhost-manager uses the settings in the lib folder     ");
			console.log("    where ever node-vhost-manager is installed. It will also try and use  ");
			console.log("    the file 'vhosts.json' in the current directory if no settings file is");
			console.log("    provided.                                                             ");
			console.log();
			console.log("    --help                        Display this help menu.                 ");
			console.log();
			console.log("    --hosts-dir=<directory>       This is the directory where all the host");
			console.log("                                  folders are located.                    ");
			console.log();
			console.log("    -d, --developer-mode=<on|off> By default this is set to 'off'. This   ");
			console.log("                                  will install all hosts development      ");
			console.log("                                  dependencies and show warning logs.     ");
			console.log("                                  Using '-d' is the same as using         ");
			console.log("                                  '--developer-mode=on'.                  ");
			process.exit();
		},
		"--hosts-dir": function(dir) {
			console.log(dir);
			if(pathIsAbsolute(dir)) {
				vhostManagerSettings.hostsDirectory = dir;
			} else {
				vhostManagerSettings.hostsDirectory = process.cwd() + "/" + dir;
			}
		},
		"--developer-mode": function(val) {
			if(val == "on" || val == "true" || val == "1") {
				vhostManagerSettings.developerMode = true;
			} else
			if(val == "off" || val == "false" || val == "0") {
				vhostManagerSettings.developerMode = true;
			} else {
				
			}
		},
		"-d": function() {
			argFuncs["--developer-mode"]("on");
		}
	};
	
	var bRecievedSettingsFile = false;
	
	for(var i=0; process.argv.length > i; i++) {
		var arg = process.argv[i];
		
		if(arg[0] == "-") {
			
			if(arg[1] == "-") {
			
				var argVal;
				if(arg.indexOf("=") > -1) {
					argVal = arg.substr(arg.indexOf("=")+1);
					arg = arg.substr(0, arg.indexOf("="));
				}
				var argFunc = argFuncs[arg];
				
				if(argFunc) {
					argFunc(argVal);
				}
			
			} else {
				for(var charIndex=0; arg.length > charIndex; charIndex++) {
					var c = arg[charIndex];
					var argFunc = argFuncs["-"+c];
					if(argFunc) {
						argFunc();
					}
				}
			}
		} else
		if(!bRecievedSettingsFile) {
			try {
				var data = fs.readFileSync(arg);
				var settings = JSON.parse(data);
				
				for(var propName in settings) {
					if(vhostManagerSettings.hasOwnProperty(propName)) {
						vhostManagerSettings[propName] = settings[propName];
					}
				}
				
				bRecievedSettingsFile = true;
			} catch(err) {
				
			}
		}
	}
	
	if(!bRecievedSettingsFile) {
		var settingsPath = fs.existsSync(process.cwd() + "/" + "vhosts.json");
		if(fs.existsSync(settingsPath)) {
			try {
				var data = fs.readFileSync(settingsPath);
				var settings = JSON.parse(data);
			} catch(err) { }
			
			for(var propName in settings) {
				if(vhostManagerSettings.hasOwnProperty(propName)) {
					vhostManagerSettings[propName] = settings[propName];
				}
			}
			
		}
	}
	
}());

global.vhmHttpServer = http.createServer();
global.vhmHttpServerListener = global.vhmHttpServer.listen(80);
global.vhmHttpServers = {};

global.vhmHttpServer.emit = function(event) {
	
	switch(event) {
		case "request":
			var req = arguments[1], res = arguments[2];
			var hostServer = global.vhmHttpServers[req.headers.host];
			if(hostServer) {
				return hostServer.emit(event, req, res);
			}
			break;
		case "connection":
			var socket = arguments[1];
			// @todo - handle 'connection' event for host server
			break;
		case "close":
			hostServer.emit(event);
			break;
		case "checkContinue":
			var req = arguments[1], res = arguments[2];
			// @todo - handle 'checkContinue' event for host server
			break;
		case "connect":
			var req = arguments[1], socket = arguments[2], head = arguments[3];
			// @todo - handle 'connect' event for host server
			break;
		case "upgrade":
			var req = arguments[1], socket = arguments[2], head = arguments[3];
			// @todo - handle 'upgrade' event for host server
			break;
		case "clientError":
			var exception = arguments[1], socket = arguments[2];
			// @todo - handle 'clientError' event for host server
			break;
		case "listening":
			// Don't think this needs to be passed to host servers?
			// It may not reach them in time.
			break;
		default:
			if(vhostManagerSettings.developerMode) {
				console.log("[vhost manager] Unaccounted for http server event '%s'.", event);
			}
			break;
	}
	
	return http.Server.prototype.emit.apply(this, arguments);
};

global.vhmHttpServer.addListener("request", function(req, res) {
	var resHtml = "<h1 style=\"text-align:center\">Host <span style=\"color:grey\">"+req.headers.host+"</span> is either invalid or unresponsive.</h1>";
	
	res.writeHead(404, {
		"Content-Type": "text/html",
		"Content-Length": resHtml.length
	});
	
	
	res.end(resHtml);
});

function mergeObjects(obj1, obj2) {
	var obj = Object.create(obj1);
	for(var propName in obj2) {
		obj[propName] = obj2[propName];
	}
	
	return obj;
}

function initHost(root) {
	var hostFilePath = root + "/" + vhostManagerSettings.hostFilename;
	var hostname = path.basename(root);
	
	console.log("[VHost Manager:%s] Initializing...", hostname);
	
	fs.readFile(hostFilePath, function(err, data) {
		var hostSettings = {};
		
		if(err || data.length == 0) {
			if(vhostManagerSettings.developerMode) {
				console.warn("[VHost Manager:%s] Could not read '%s'. Using default.", hostname, vhostManagerSettings.hostFilename);
			}
			
			hostSettings = Object.create(defaultHostSettings);
		} else {
			
			hostSettings = mergeObjects(defaultHostSettings, JSON.parse(data));
		
		}
		
		if(hostSettings.name) { hostSettings.name = hostname; }
		
		var hostModule = new ImportableModule;
		var hostConsole = Object.create(console);
		var overrideConsoleLog = function(name) {
			return function() {
				if(arguments[0]) {
					arguments[0] = "["+hostname+"] " + arguments[0];
				}
				
				return console[name].apply(this, arguments);
			};
		};
		hostConsole.log = overrideConsoleLog("log");
		hostConsole.info = overrideConsoleLog("info");
		hostConsole.error = overrideConsoleLog("error");
		hostConsole.warn = overrideConsoleLog("warn");
		
		hostModule.imports = {
			require: function(name) {
				var vhmName = __dirname + "/vhm-override-modules/"+name+".js";
				if(fs.existsSync(vhmName)) {
					var m = new Module;
					m.hostname = hostname;
					m.load(vhmName);
					return m.exports;
				} else {
					return requireWithImports(name, hostModule.imports);
				}
			},
			console: hostConsole
		};
		
		var remainingDeps = 0;
		
		var loadHost = function() {
			try {
				hostModule.load(root + "/" + hostSettings.main);
			} catch(err) {
				console.error("[VHost Manager:%s] Could not load '%s'. Host unresponsive.", hostname, hostSettings.main);
				if(err.errno != 34) {
					console.error(err);
				}
			}
		};
		
		var bNeedInstallDep = false;
		
		var handleDep = function(name, version) {
			
			npm.load({}, function(err) {
				if(err) { console.log(err); }
				
				npm.on("log", function(msg) { msg=""; });
				
				npm.commands.list([name+"@"+version], true, function(err, data) {
					
					// @hack - this isn't really documented... but it seems to work?
					//         need better solution.
					if(!data._found) {
						
						if(!bNeedInstallDep) {
							console.log("[VHost Manager:%s] Installing dependencies...", hostname);
						}
						
						bNeedInstallDep = true;
						
						npm.commands.install([name+"@"+version], function(err, data) {
							remainingDeps--;
							if(remainingDeps == 0) {
								loadHost();
							}
						});
					}
				});
				
				
				
			});
			
			
		};
		
		if(hostSettings.dependencies) {
			for(var depName in hostSettings.dependencies) remainingDeps++;
		}
		
		if(vhostManagerSettings.developerMode && hostSettings.devDependencies) {
			for(var depName in hostSettings.devDependencies) remainingDeps++;
		}
		
		if(remainingDeps == 0) {
			loadHost();
		} else {
			if(hostSettings.dependencies)
			for(var depName in hostSettings.dependencies) {
				var depVersion = hostSettings.dependencies[depName];
				handleDep(depName, depVersion);
			}
			
			if(vhostManagerSettings.developerMode && hostSettings.devDependencies)
			for(var depName in hostSettings.devDependencies) {
				var depVersion = hostSettings.devDependencies[depName];
				handleDep(depName, depVersion);
			}
			
		}
		
	});
}

function initHosts() {
	fs.readdir(vhostManagerSettings.hostsDirectory, function(err, files) {
		
		if(err) {
			if(err.errno == 34) {
				console.log("[vhost manager] Host directory doesn't exist! Use --host-dir=<directory> and make sure it exists. Use --help for more.");
				process.exit();
			}
			return;
		}
		
		if(files.length == 0) {
			console.log("[vhost manager] There are no hosts in the host directory.");
			console.log("[vhost manager] Generating default 'localhost' ...");
			
			fs.copySync(__dirname + "/default-host", vhostManagerSettings.hostsDirectory + "/localhost");
			files.push("localhost");
		}
		
		for(var fileIndex in files) {
			
			// Create scope to preserve filePath and filename in other callbacks.
			(function() {
				var filePath = vhostManagerSettings.hostsDirectory + "/" + files[fileIndex];
				var filename = files[fileIndex];
				
				fs.stat(filePath, function(err, stats) {
					if(err) { console.error(err); return; }
					
					if(stats.isDirectory()) {
						initHost(filePath);
					}
				});
			}());
			
		}
	});
}

initHosts();
