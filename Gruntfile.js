module.exports = function(grunt) {

    // Project configuration
    grunt.initConfig({

        clean: ["build", "public/images", "public/javascripts", "public/stylesheets"],

        // The Jade task must be run prior to this task, because the Backbone views
        // reference templates via require().
        requirejs: {
            dev: {
                options: {
                    logLevel: 0,
                    baseUrl: "./app/",
                    mainConfigFile: "./app/config.js",
                    out: "public/javascripts/required.js",
                    name: "main",
                    optimize: "none",
                    findNestedDependencies: true, // for dynamic local includes
                    generateSourceMaps: true,
                    preserveLicenseComments: false, // so we can use source maps
                    useStrict: true
                }
            },
            optimize: {
                options: {
                    logLevel: 0,
                    baseUrl: "./app/",
                    mainConfigFile: "./app/config.js",
                    out: "public/javascripts/required.js",
                    name: "main",
                    optimize: "none",
                    findNestedDependencies: true, // for dynamic local includes
                    generateSourceMaps: false,
                    useStrict: true
                }
            }
        },

        "jsbeautifier": {
            files: ["Gruntfile.js", "server.js", "assets/js/libs/**/*.js", "app/**/*.js", "routes/**/*.js", "views/**/*.js"],
            options: {
                //config: "path/to/configFile",
                html: {
                    braceStyle: "collapse",
                    indentChar: " ",
                    indentScripts: "keep",
                    indentSize: 4,
                    maxPreserveNewlines: 10,
                    preserveNewlines: true,
                    unformatted: ["a", "sub", "sup", "b", "i", "u"],
                    wrapLineLength: 0
                },
                css: {
                    indentChar: " ",
                    indentSize: 4
                },
                js: {
                    braceStyle: "collapse",
                    breakChainedMethods: false,
                    e4x: false,
                    evalCode: false,
                    indentChar: " ",
                    indentLevel: 0,
                    indentSize: 4,
                    indentWithTabs: false,
                    jslintHappy: false,
                    keepArrayIndentation: false,
                    keepFunctionIndentation: false,
                    maxPreserveNewlines: 10,
                    preserveNewlines: true,
                    spaceBeforeConditional: true,
                    spaceInParen: false,
                    unescapeStrings: false,
                    wrapLineLength: 0
                }
            }
        },

        bower_install: {
            install: {
                options: {
                    targetDir: "./app/assets/bower"
                }
            }
        },

        bower: {
            target: {
                rjsConfig: './app/config.js',
                options: {
                    // Exclude Jade because we need to point the client to the runtime file, not the full Jade core
                    exclude: ['jade']
                }
            }
        },

        // Used to copy some specific assets from various packages to public directories.
        //
        // Most Bower-managed javascript gets vacuumed in through the RequireJS process, look in app/config.js
        // for those inclusions.
        //
        // Most Bower-managed CSS and LESS gets pulled in through the ```less``` and ```cssmin``` steps below.
        //
        // Oddballs and/or image assets belong here.
        copy: {
            main: {
                files: [{
                    expand: true,
                    cwd: 'app/assets/bower/requirejs/',
                    src: 'require.js',
                    dest: 'public/javascripts/'
                }, {
                    expand: true,
                    cwd: 'assets/images/',
                    src: ['**/*.png', '**/*.jpg', '**/*.gif'],
                    dest: 'public/images/'
                }, {
                    expand: true,
                    cwd: 'app/assets/bower/bootstrap/fonts',
                    src: '*',
                    dest: 'public/fonts/'
                }, {
                    expand: true,
                    cwd: 'app/assets/bower/leaflet/dist/images',
                    src: '*',
                    dest: 'public/images/leaflet/'
                }, {
                    expand: true,
                    cwd: 'app/assets/bower/fuelux/fonts',
                    src: '*',
                    dest: 'public/fonts/'
                }, {
                    expand: true,
                    cwd: 'assets/fonts/',
                    src: '**/*.woff',
                    dest: 'public/fonts/'
                }]
            }
        },

        watch: {

            templates: {
                files: ['./app/Templates/**/*.jade', './app/routines/**/*.jade'],
                tasks: ['jade', 'requirejs:dev', 'develop'],
                options: {
                    interrupt: true,
                    nospawn: true
                }
            },

            all: {
                files: ['./app/**/*.js', './spec/**/*.js'],
                tasks: ['requirejs', 'develop'],
                options: {
                    interrupt: false,
                    nospawn: true
                }
            },

            server_js: {
                files: ['config.json', 'assets/js/libs/**/*.js'],
                tasks: ['develop'],
                options: {
                    interrupt: false,
                    nospawn: true
                }
            },

            styles: {
                files: ['assets/less/**/*.less', 'assets/css/**/*.css', './app/routines/**/*.less'],
                tasks: ['less', 'cssmin', 'develop'],
                options: {
                    interrupt: true,
                    nospawn: true
                }
            },

            server: {
                files: ['server.js'],
                tasks: ['develop']
            }

        },

        jade: {
            options: {
                amd: true,
                client: true,
                pretty: true,
                compileDebug: false
            },
            files: {
                expand: false,
                src: ['app/Templates/**/*.jade', 'app/routines/**/*.jade'],
                dest: 'build/templates.js'
            }
        },

        jasmine: {
            all: ['test/jasmine/index.html']
        },

        simplemocha: {
            all: {
                src: 'test/mocha/*.js',
                options: {
                    globals: ['should'],
                    timeout: 3000,
                    ignoreLeaks: false,
                    ui: 'bdd'
                }
            }
        },

        // Note that we're including Bootstrap's LESS via an @import to the Bootstrap Bower directory.
        // The order in the array matters, keep the app/routines/**/*.less last so styles there can overwrite others.
        less: {
            all: {
                files: {
                    'build/less.css': ['assets/less/assets.less', 'app/routines/**/*.less']
                }
            }
        },

        // Must be after the less task, or that won't get minified
        // into the final client file.
        //
        // Also pulls in files from Bower-installed components as required.
        cssmin: {
            compress: {
                files: {
                    // These are enumerated specifically to be verbose about where they're from.
                    "public/stylesheets/min.css": [
                        "build/less.css",
                        "assets/css/**/*.css",
                        "app/assets/bower/leaflet/dist/leaflet.css",
                        "app/assets/bower/seiyria-bootstrap-slider/css/bootstrap-slider.css",
                        "app/assets/bower/fuelux/dist/css/fuelux.css"
                    ]
                }
            }
        },

        svgmin: { // Task
            dist: {
                files: [{ // Dictionary of files
                    expand: true, // Enable dynamic expansion.
                    cwd: 'assets/images', // Src matches are relative to this path.
                    src: ['**/*.svg'], // Actual pattern(s) to match.
                    dest: 'public/images', // Destination path prefix.
                    ext: '.min.svg' // Dest filepaths will have this extension.
                        // ie: optimise img/src/branding/logo.svg and store it in img/branding/logo.min.svg
                }]
            }
        },

        develop: {
            server: {
                file: 'server.js'
            }
        }
    });

    // Load additional tasks.
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jade');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-jsbeautifier');
    grunt.loadNpmTasks('grunt-githooks');

    // Conflict with the bower-requirejs 'bower' task if not renamed.
    grunt.loadNpmTasks('grunt-bower-task');
    grunt.renameTask('bower', 'bower_install');

    // grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-svgmin');
    grunt.loadNpmTasks('grunt-bower-requirejs');
    grunt.loadNpmTasks('grunt-develop');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // Task registration.
    // Jade must be compiled to templates before the requirejs task can run,
    // because the Backbone views require templates.
    grunt.registerTask('default', ['clean', 'bower_install', 'bower', 'jade', 'requirejs:dev', 'copy', 'less', 'svgmin', 'cssmin', 'develop', 'watch']);
    grunt.registerTask('release', ['clean', 'bower_install', 'bower', 'jade', 'requirejs:optimize', 'copy', 'less', 'svgmin', 'cssmin']);
    grunt.registerTask('tidy', ['jsbeautifier'])
};
