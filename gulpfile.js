var fs = require('fs');
var _ = require('lodash');
var gulp = require('gulp');

// Require tasks
var tasks = fs.readdirSync('./tasks');

_.forEach(tasks, (task) => {
  require('./tasks/' + task)(gulp);
});

gulp.task('default', ['ts']);
