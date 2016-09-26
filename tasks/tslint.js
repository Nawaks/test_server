const tslint = require('gulp-tslint');

module.exports = (gulp) => {
  gulp.task('tslint', () => {
    return gulp.src('src/*.ts')
      .pipe(tslint())
      .pipe(tslint.report('verbose'));
  });
};
