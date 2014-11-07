var path = require('path');

/**
 * Default reporter for component-hint. This will batch up all messages emitted and print the
 * results when all tests are complete.
 * 
 * @param {Object} componentHint
 * @returns {undefined}
 */
module.exports = function (componentHint) {
	var lintMessagesObj = {};

	// Catch all warning messages and store them to messages object
	componentHint.on('lint.warning', function (componentPath, warningMessage) {
		lintMessagesObj[componentPath] = lintMessagesObj[componentPath] || {};
		lintMessagesObj[componentPath].warning = lintMessagesObj[componentPath].warning || [];
		lintMessagesObj[componentPath].warning.push(warningMessage);
	});

	// Catch all error messages and store them to messages object
	componentHint.on('lint.error', function (componentPath, errorMessage) {
		lintMessagesObj[componentPath] = lintMessagesObj[componentPath] || {};
		lintMessagesObj[componentPath].error = lintMessagesObj[componentPath].error || [];
		lintMessagesObj[componentPath].error.push(errorMessage);
	});

	// Display progress if verbose
	if (componentHint.verbosity > 1) {
		componentHint.on('onTheFlyTests.started', function (componentPath) {
			process.stdout.write('Loading component: ' + componentPath + '\n');
		});

		componentHint.on('onTheFlyTests.progress', function (componentPath, testName) {
			process.stdout.write(' - ' + testName + ' [done]\n');
		});

		componentHint.on('onTheFlyTests.complete', function (componentPath) {
			process.stdout.write(' ' + componentPath + ' complete\n');
			process.stdout.write('\n');
		});

		componentHint.on('postStageTests.started', function () {
			process.stdout.write('Started post stage tests:\n');
		});

		componentHint.on('postStageTests.progress', function (testName) {
			process.stdout.write(' - ' + testName + ' [done]\n');
		});

		componentHint.on('postStageTests.complete', function () {
			process.stdout.write(' Post stage tests complete\n');
		});
	} else if (componentHint.verbosity === 1) {
		var pwd = process.env['PWD'];
		componentHint.on('onTheFlyTests.started', function (componentPath) {
			var relativePath = path.relative(pwd, componentPath);
			process.stdout.write('Loading component: ' + relativePath + '\n');
		});
	}

	// Once all tests are complete, pretty print the results
	componentHint.on('postStageTests.complete', function () {
		if (componentHint.silent) {
			// Do nothing if we are in silent mode
			return;
		}

		if (!componentHint.quiet) {
			for (var componentPath in lintMessagesObj) {
				if (!lintMessagesObj.hasOwnProperty(componentPath)) {
					continue;
				}

				var fileWarnings = lintMessagesObj[componentPath].warning || [];
				var fileErrors = lintMessagesObj[componentPath].error || [];
				if (!fileErrors.length && !fileWarnings.length) {
					continue;
				}

				process.stdout.write('\n');
				process.stdout.write(componentPath + '\n');

				for (var warningI = 0; warningI < fileWarnings.length; warningI += 1) {
					process.stdout.write('[warning] ' + fileWarnings[warningI].replace(/\n/g, '\n  ') + '\n');
				}

				for (var errorI = 0; errorI < fileErrors.length; errorI += 1) {
					process.stdout.write('[error] ' + fileErrors[errorI].replace(/\n/g, '\n  ') + '\n');
				}
			}
		}

		// Final report
		if (componentHint.totalWarnings > 0 || componentHint.totalErrors > 0) {
			process.stdout.write('\n');
			process.stdout.write('Total Warnings: ' + componentHint.totalWarnings + '\n');
			process.stdout.write('Total Errors: ' + componentHint.totalErrors + '\n');
		} else {
			process.stdout.write('No errors found!\n');
		}
	});
};
