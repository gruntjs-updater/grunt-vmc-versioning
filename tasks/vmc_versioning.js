/*
 * grunt-vmc-versioning
 * https://github.com/vemec/grunt-vmc-versioning
 *
 * Copyright (c) 2014 Diego Ghersi
 * Licensed under the MIT license.
 */

'use strict';

// Libs
var crypto = require('crypto');
var chalk  = require('chalk');

module.exports = function(grunt) {

    grunt.registerMultiTask('vmc_versioning', 'DESC', function() {

        // Default options
        var options = this.options({
            config_output: true,                    // Default true
            config_wrap_name: 'versioned_files',    // Default versioned_files
            config_file: 'versioning_config.json',  // Default versioning_config.json
            config_dir: 'tmp',                      // Default tmp
            hash_length: 6,                         // Default 6
            algorithm: 'md5',                       // Default md5 - other options sha1/sha256/sha512
            encoding: 'utf8',                       // Default utf8
            prefix: ''                              // Default empty
        });

        // init output data
        var file_output = {};

        // Files...
        this.files.forEach( function(file) {
            if (!file.src.length) {
                return grunt.fail.warn('No source files were found.');
            }

            file.src.forEach( function(filepath) {
                if (grunt.file.isDir(filepath)) {
                  return;
                }

                // Generate hash based on file.
                var file_content = grunt.file.read(filepath, options.encoding);

                if (file_content.length === 0) {
                    grunt.log.warn('File ' + chalk.cyan(filepath) + ' is empty.');
                    return;
                }
                var hash = crypto.createHash(options.algorithm).update(file_content).digest('hex').substring(0, options.hash_length);

                // Get filename and extension
                var filename = filepath.replace(/(.*)\//gi, '');
                var name     = getFileNameOrExtension(filename, 'name');
                var ext      = getFileNameOrExtension(filename, 'ext');

                // Fill output data
                file_output['files'] = file_output['files'] || {};
                file_output['files'][ext] = file_output['files'][ext] || [];

                // Generate file hash
                if (options.prefix.length > 0) {
                    hash = options.prefix+'.'+hash;
                }
                var result_file = name + '.' + hash + '.' + ext;

                // Search files with the same hash
                var duplicate_found = false;
                filename.split(".").forEach( function(part) {
                    if (part === hash)
                    {
                        // duplicate flag
                        duplicate_found = true;
                        grunt.verbose.writeln('File ' + chalk.cyan(filepath) + ' found.');
                        grunt.verbose.writeln('File with the same hash found, current file hash: ' + chalk.red(part) +
                        ', file content generated hash ' + chalk.red(hash) + '. I will not create a new file, it is the same file.');
                    }
                });

                // Create file?
                if (!duplicate_found)
                {
                    // Found file
                    grunt.log.writeln('File ' + chalk.cyan(filepath) + ' found.');
                    result_file = file.dest + '/' + result_file;
                    if (grunt.file.exists(result_file))
                    {
                        grunt.log.writeln(chalk.yellow('File ' + result_file + ' unchanged.'));
                    }
                    else
                    {
                        grunt.file.write(result_file, file_content);
                        grunt.log.ok('File ' + chalk.cyan(result_file) + ' created.');
                    }

                }

                // json output
                file_output['files'][ext].push(result_file);

            });

        });

        // Save JSON output file.
        grunt.log.writeln();
        if (options.config_output) {
            outputJSONFile(file_output, options.config_dir, options.config_wrap_name, options.config_file);
        }

    });

    /**
     * Get name and extension of a filename
     * @param  {string} File complete filename
     * @param  {string} Type output type 'name' | 'ext'
     * @return {string}
     */
    function getFileNameOrExtension(file, type)
    {
        var file_name = file.split(".");
        var result = '';
        if (type === 'name')
        {
            file_name.pop();
            result =  file_name.join('.');
        }
        else if(type === 'ext')
        {
            if(file_name.length === 1 || (file_name[0] === "" && file_name.length === 2))
            {
                result = "";
            }

            result = file_name.pop();
        }

        // return name
        return result;
    }

    /**
     * JSON config file
     * @param  {object} output      Files versions.
     * @param  {string} dest        Dest to save config file.
     * @param  {string} name_space  Name to wrap config content.
     * @param  {string} config_file Config file name.
     * @return {undefined}
     */
    function outputJSONFile(output, dest, name_space, config_file)
    {
        var obj = {};
        obj[name_space] = output;
        var json = JSON.stringify(obj, null, '\t');
        grunt.log.writeln('Saving JSON config file...');
        grunt.file.write(dest + '/' + config_file, json);
        grunt.log.ok('File ' + chalk.cyan(dest +'/'+ config_file) + ' created.');
    }

};