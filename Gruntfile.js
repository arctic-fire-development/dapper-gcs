module.exports = function(grunt) {

    // Project configuration
    grunt.initConfig({

        // The Jade task must be run prior to this task, because the Backbone views
        // reference templates via require().
        requirejs: {
            compile: {
                options: {
                    baseUrl: "app/",
                    mainConfigFile: "app/config.js",
                    out: "public/javascripts/required.js",
                    name: "main",
                    optimize: "none"
                }
            }
        },

        watch: {

            all: {
                files: ['./app/**/*.js', './app/Templates/**/*.jade', './spec/**/*.js', 'assets/js/libs/**/*.js'],
                tasks: ['jade requirejs'],
                options: {
                    interrupt: true
                }
            },

            styles: {
                files: ['assets/less/**/*.less', 'assets/css/**/*.css'],
                tasks: ['less mincss'],
                options: {
                    interrupt: true
                }
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
                src: ['app/**/*.jade'],
                dest: 'app/Templates/templates.js'
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

        // Not really necessary since Express is doing it, but perhaps
        // for bundling/packaging.
        less: {
            all: {
                files: {
                    'build/less.css': ['assets/less/assets.less']
                }
            }
        },

        // Must be after the less task, or that won't get minified
        // into the final client file.
        cssmin: {
            compress: {
                files: {
                    "public/stylesheets/min.css": ["build/less.css", "assets/css/**/*.css"]
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

        }
    });

    // Load additional tasks.
    grunt.loadNpmTasks('grunt-contrib-watch');
    //grunt.loadNpmTasks('grunt-jade-plugin');
    grunt.loadNpmTasks('grunt-contrib-jade');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-svgmin');

    // Task registration.
    // Jade must be compiled to templates before the requirejs task can run,
    // because the Backbone views require templates.
    grunt.registerTask('default', ['jade', 'requirejs', 'less', 'cssmin', 'svgmin']);

};