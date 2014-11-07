var fs = require('fs');
var path = require('path');
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

var helpers = require('./helpers.js');


/**
 * Load tests from tests folder. These will be ordered by filename so patterns such as 01_someTest
 * can be used to influence order of test execution. Further to this tests are broken up into 2
 * stages. The onTheFly stage will perform tests right after it loads the data for a single
 * component, whilst the postStage stage will perform its tests after all relevant data has been
 * loaded.
 * 
 * Further to this any file starting with '.' character will be ignored.
 */
var testsFolder = path.join(__dirname, './tests');
var testFiles = fs.readdirSync(testsFolder);

var onTheFlyTests = {};
var postStageTests = {};

for (var testI = 0; testI < testFiles.length; testI += 1) {
	var testFile = testFiles[testI];
	if (testFile[0] === '.' || path.extname(testFile) !== '.js') {
		continue;
	}

	var testModule = require(path.join(testsFolder, testFile));

	// Push in onTheFlyTest if it exists
	if (testModule.onTheFlyTest) {
		onTheFlyTests[testFile] = {
			name: testModule.name || testFile,
			test: testModule.onTheFlyTest
		};
	}

	// Push in postStageTest if it exists
	if (testModule.postStageTest) {
		postStageTests[testFile] = {
			name: testModule.name || testFile,
			test: testModule.postStageTest
		};
	}
}


/**
 * Component Hint event emitter object.
 * 
 * @param {Object} options
 * @returns {ComponentHint}
 */
function ComponentHint(options) {
	// Make this an event emitter
	EventEmitter.call(this);

	// List of all components that have been checked, we keep this list so that the same components
	// are not checked twice.
	this.lintedComponents = [];

	// Object holding all external dependencies and their versions
	this.dependencyVersions = {};

	// Set linting options from given options or defaults
	options = options || {};
	this.depPaths = options.depPaths || [];
	this.lookupPaths = options.lookupPaths || [];
	this.recursive = options.recursive || false;
	this.verbosity = options.verbosity || 0;
	this.quiet = options.quiet || false;
	this.silent = options.silent || false;
	this.ignorePaths = options.ignorePaths || [];
	this.warnPaths = options.warnPaths || [];

	// Inject default dep path if it exists
	if (!this.depPaths.length && fs.existsSync('./components')) {
		this.depPaths.push('./components');
	}

	// Keep a count of total errors and warnings
	this.totalErrors = 0;
	this.on('lint.error', function () {
		this.totalErrors += 1;
	});

	this.totalWarnings = 0;
	this.on('lint.warning', function () {
		this.totalWarnings += 1;
	});
}

// Inherit event emitter onto ComponentHint object
inherits(ComponentHint, EventEmitter);


/**
 * Function which loads component data for given component path
 * 
 * @param {String} componentPath
 * @param {Boolean} isExternalDep
 * @param {Function} cb
 * @returns {undefined}
 */
ComponentHint.prototype.loadComponentData = function (componentPath, isExternalDep, cb) {
	var self = this;
	var componentJson;
	var absolutePath = path.resolve(componentPath);

	// Check if this components is in our warn only list.
	// If so set appropriate eventChannel.
	var eventChannel = 'lint.error';
	if (helpers.pathMatchPatterns(absolutePath, this.warnPaths)) {
		eventChannel = 'lint.warning';
	}

	async.series([
		function (callback) {
			// Try and load the component.json file
			var jsonFilename = path.join(componentPath, 'component.json');
			fs.readFile(jsonFilename, function (error, data) {
				if (error) {
					self.emit(eventChannel, componentPath, 'Failed to load Component JSON file: ' + error.message);
					return callback(error);
				}

				// Attempt to load JSON file
				try {
					componentJson = JSON.parse(data);
				} catch (e) {
					var error = new Error('Failed to parse component.json file: ' + jsonFilename);
					self.emit(eventChannel, componentPath, error.message);
					return callback(error);
				}

				return callback();
			});
		}
	], function (error) {
		if (error) {
			return cb(error);
		}

		return cb(null, {
			'path': componentPath,
			'json': componentJson,
			'channel': eventChannel
		});
	});
};


/**
 * Function which loads several component paths, and checks them sequentially.
 * 
 * @param {Array} componentPaths
 * @param {Boolean} isExternalDep
 * @param {Function} cb
 * @returns {undefined}
 */
ComponentHint.prototype.checkPaths = function (componentPaths, isExternalDep, cb) {
	var self = this;
	componentPaths = (typeof componentPaths === 'string') ? [componentPaths] : componentPaths;
	async.eachSeries(componentPaths, function (checkPath, callback) {
		self.onTheFlyChecks(checkPath, isExternalDep, callback);
	}, cb);
};


/**
 * Function which loads all relevant data for a single component path, and performs checks on the
 * fly.
 * 
 * @param {String} componentPath
 * @param {Boolean} isExternalDep
 * @param {Function} cb
 * @returns {undefined}
 */
ComponentHint.prototype.onTheFlyChecks = function (componentPath, isExternalDep, cb) {
	var self = this;

	var absolutePath = path.resolve(componentPath);
	var resolvedLocalDeps = [];
	var resolvedExternalDeps = [];

	// Check if this component has already been linted
	if (this.lintedComponents.indexOf(absolutePath) >= 0) {
		return cb();
	}

	// Check if this component is in our ignore list
	if (helpers.pathMatchPatterns(absolutePath, this.ignorePaths)) {
		return cb();
	}

	// Mark this path as checked and emit started event
	this.lintedComponents.push(absolutePath);
	this.emit('onTheFlyTests.started', absolutePath);

	// Load all relevent data
	this.loadComponentData(absolutePath, isExternalDep, function (error, componentData) {
		if (error) {
			// We don't have to return the error here as it was already emited as a lint error. This
			// is more so used to let us know if we should continue with linting tests for this
			// component.
			return cb();
		}

		// Begin onTheFly tests
		async.eachSeries(Object.keys(onTheFlyTests).sort(), function (testFile, callback) {
			var onTheFlyTest = onTheFlyTests[testFile];

			onTheFlyTest.test(componentData, self, function (resolvedDeps) {
				// Emit progress event
				self.emit('onTheFlyTests.progress', absolutePath, onTheFlyTest.name);

				// Add any resolved local deps to local deps list
				if (resolvedDeps && resolvedDeps.localDeps) {
					resolvedLocalDeps.push.apply(resolvedLocalDeps, resolvedDeps.localDeps || []);
				}

				// Add any resolved external deps to external deps list
				if (resolvedDeps && resolvedDeps.externalDeps) {
					resolvedExternalDeps.push.apply(resolvedExternalDeps, resolvedDeps.externalDeps || []);
				}

				return callback();
			});
		}, function () {
			// Emit event singifying completion for this file
			self.emit('onTheFlyTests.complete', absolutePath);

			// Callback if not recursive
			if (!self.recursive) {
				return cb();
			}

			// Recurse into local deps first
			async.eachSeries(resolvedLocalDeps, function (depPath, callback) {
				self.onTheFlyChecks(depPath, isExternalDep, callback);
			}, function () {
				// Mark these and their deps as external deps from here on
				var isExternalDep = true;

				// Now recurse into external deps
				async.eachSeries(resolvedExternalDeps, function (depPath, callback) {
					self.onTheFlyChecks(depPath, isExternalDep, callback);
				}, cb);
			});
		});
	});
};


/**
 * Function which executes all post stage tests.
 * 
 * @param {Function} cb
 * @returns {undefined}
 */
ComponentHint.prototype.postChecks = function (cb) {
	var self = this;

	// Emit event showing postStage tests have started
	this.emit('postStageTests.started');

	// Execute postStage tests
	async.eachSeries(Object.keys(postStageTests).sort(), function (testFile, callback) {
		var postStageTest = postStageTests[testFile];
		postStageTest.test(self, function () {
			// Emit progress event
			self.emit('postStageTests.progress', postStageTest.name);
			return callback();
		});
	}, function () {
		// Emit event singifying postStage tests completion
		self.emit('postStageTests.complete');
		return cb();
	});
};


// Export ComponentHint class
module.exports = ComponentHint;
