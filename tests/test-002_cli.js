var assert = require('assert');
var path = require('path');
var cli = require('../lib/cli.js');

//
var casePath = './tests/cases';
function resolveCasePath(caseName, componentPath) {
	return path.resolve(casePath, caseName, componentPath);
}

//
var directoryStack = [];
function pushd(chdir) {
	directoryStack.push(process.cwd());
	process.chdir(chdir);
}
function popd() {
	if (directoryStack.length < 1) {
		return;
	}
	var previousDir = directoryStack.pop();
	process.chdir(previousDir);
}

//
describe('Command Line Interface', function () {
	it('checking --verbosity defaults', function (done) {
		cli.execute([
			'node', path.resolve('./bin/component-hint'),
			resolveCasePath('case-clean', 'component_A'),
			'--reporter', 'devNull'
		], function (error, componentHint) {
			assert.ifError(error, 'cli#execute returned an error');
			assert.equal(componentHint.verbosity, 0, 'verbosity did not return correct default');
			done();
		});
	});

	it('checking --quiet defaults', function (done) {
		cli.execute([
			'node', path.resolve('./bin/component-hint'),
			resolveCasePath('case-clean', 'component_A'),
			'--reporter', 'devNull'
		], function (error, componentHint) {
			assert.ifError(error, 'cli#execute returned an error');
			assert.equal(componentHint.quiet, false, 'quiet did not return correct default');
			done();
		});
	});

	it('checking --silent defaults', function (done) {
		cli.execute([
			'node', path.resolve('./bin/component-hint'),
			resolveCasePath('case-clean', 'component_A'),
			'--reporter', 'devNull'
		], function (error, componentHint) {
			assert.ifError(error, 'cli#execute returned an error');
			assert.equal(componentHint.silent, false, 'silent did not return correct default');
			done();
		});
	});

	it('checking --warn-paths defaults', function (done) {
		cli.execute([
			'node', path.resolve('./bin/component-hint'),
			resolveCasePath('case-clean', 'component_A'),
			'--reporter', 'devNull'
		], function (error, componentHint) {
			assert.ifError(error, 'cli#execute returned an error');
			assert.deepEqual(componentHint.warnPaths, [], 'warnPaths did not return correct default');
			done();
		});
	});

	it('checking --dep-paths defaults', function (done) {
		pushd('./tests/cases/case-clean');
		try {
			cli.execute([
				'node', path.resolve('../../../bin/component-hint'),
				'./component_A',
				'--reporter', 'devNull'
			], function (error, componentHint) {
				popd();
				assert.ifError(error, 'cli#execute returned an error');
				assert.deepEqual(componentHint.depPaths, [ './components' ], 'depPaths did not return correct default');
				done();
			});
		} catch (e) {
			popd();
			throw e;
		}
	});

	it('checking --ignore-paths defaults', function (done) {
		cli.execute([
			'node', path.resolve('./bin/component-hint'),
			resolveCasePath('case-clean', 'component_A'),
			'--reporter', 'devNull'
		], function (error, componentHint) {
			assert.ifError(error, 'cli#execute returned an error');
			assert.deepEqual(componentHint.ignorePaths, [], 'ignorePaths did not return correct default');
			done();
		});
	});

	it('checking --lookup-paths defaults', function (done) {
		cli.execute([
			'node', path.resolve('./bin/component-hint'),
			resolveCasePath('case-clean', 'component_A'),
			'--reporter', 'devNull'
		], function (error, componentHint) {
			assert.ifError(error, 'cli#execute returned an error');
			assert.deepEqual(componentHint.lookupPaths, [], 'lookupPaths did not return correct default');
			done();
		});
	});
});
