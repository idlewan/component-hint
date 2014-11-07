Component Hint
==============
Component Hint is a linting tool for [Component.io](https://github.com/component/component). The
main goal is to detect nuisances prior to publication and alleviate debugging time (e.g. missing
paths for local dependencies).

Implemented Checks
------------------
* Ensures a given components contains a `component.json` file
* Checks each local dependency exists in exactly one of the given paths
* Detects any unused paths in the `component.json` file
* Check each external dependency exists in exactly one of the given dependency paths (--dep-paths)
* Check dependencies are only required at a single version through the project
* Checks that a component doesn't have itself as a dependency
* Checks that any files listed in the `component.json` file (i.e. scripts, styles, etc.) actually
  exist

Other Features
--------
* In the event a local dependency isn't resolved, it will give you a hint as to where you can find
  it (uses the given `--lookupPaths` option)
* Skips folders with the same name as a dependency if it does not contain a `component.json` file
* Recurses into dependencies and checks if there are any other dependency errors
  (this can be switched to warning level by using --warn-paths option)

To Do
-----
* Parse scripts for usages of `require()` and ensure those components exist in the `component.json`
* Check that the name inside the `component.json` file is the name used for the folder
* [Other issues](https://github.com/Wizcorp/component-hint/issues)

Installation
------------
```
npm install component-hint
./node_modules/.bin/component-hint
```

OR if installed globally component-hint can be accessed like any other component command
```
npm install -g component-hint
component hint
```

Usage
-----
```
  Usage: component-hint [options] <component_path ...>

  Options:

    -h, --help                  output usage information
    -V, --version               output the version number
    -v, --verbosity <n>         Change tests verbosity. (cannot be used with --quiet
                                or --silent)
    -q, --quiet                 Display only the final outcome.
    -s, --silent                Suppress all output.
    -r, --recursive             Recurse into local and external dependencies.
    -d, --dep-paths <paths>     Colon separated list of paths to external
                                dependencies. (default: "./components")
    -w, --warn-paths <paths>    Colon separated list of paths where component errors
                                will be converted to warnings. (supports minimatch
                                globbing)
    -i, --ignore-paths <paths>  Colon separated list of paths component-hint should
                                ignore. (supports minimatch globbing)
    -l, --lookup-paths <paths>  Colon separated list of paths to check for the
                                existence of missing local dependencies. This is used
                                to give the user a hint where they can find them.
        --reporter <path>       Path to reporter file to use for output formatting.

  Examples:

    Check multiple component entry points
    $ component-hint /path/to/single/component /path/to/another/component

    Check multiple component entry point which exist in the same folder
    $ component-hint /path/to/multiple/component/folder/*/
```

License
-------
Component Hint is distributed under the `MIT` License.
