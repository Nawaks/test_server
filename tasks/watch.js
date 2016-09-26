module.exports = (gulp) => {

  gulp.task('watch', ['ts'], () => {
    gulp.watch('src/**/*.ts', ['ts']);
  });

};
