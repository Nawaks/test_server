var ts = require('gulp-typescript');
var merge = require('merge2');
var tsProject = ts.createProject('tsconfig.json');

module.exports = (gulp) => {

  gulp.task('ts', ['tslint'], () => {
    var tsResult = gulp.src(['typings/tsd.d.ts', 'src/**/*.ts'])
      .pipe(ts(tsProject));

    return merge([
      tsResult.dts.pipe(gulp.dest('lib')),
      tsResult.js.pipe(gulp.dest('lib'))
    ]);
  });

};
