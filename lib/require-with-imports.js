var Module = module.constructor;
var ImportableModule = require("importable-module");

module.exports = function(path, imports) {
	var m = new ImportableModule;
	m.imports = imports;
	
	return Module._load(require.resolve(path, m), m);
};
