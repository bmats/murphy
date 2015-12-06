import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';

const $ = gulpLoadPlugins();

const paths = {
  typescript: 'src/**/*',
  static: 'static/*.*',
  styles: 'static/styles/*',
  build: './build'
};

function logError(err) {
  $.util.log(err.toString());
}

gulp.task('typescript', () => {
  return gulp.src(paths.typescript)
    .pipe($.typescript({
      target: 'es5', // TODO: es6 doesn't work
      module: 'commonjs',
      jsx: 'react'
    })) // errors are logged
    .pipe($.babel().on('error', logError))
    .pipe(gulp.dest(paths.build + '/src'))
    .pipe($.livereload());
});

gulp.task('copy', () => {
  return gulp.src(paths.static)
    .pipe(gulp.dest(paths.build + '/static'))
    .pipe($.livereload());
});

gulp.task('stylus', () => {
  return gulp.src(paths.styles)
    .pipe($.stylus({
      compress: false
    }).on('error', logError))
    .pipe($.concat('all.css'))
    .pipe(gulp.dest(paths.build + '/static'))
    .pipe($.livereload());
});

gulp.task('watch', ['build'], () => {
  gulp.watch(paths.typescript, ['typescript']);
  gulp.watch(paths.static, ['copy']);
  gulp.watch(paths.styles, ['stylus']);

  $.livereload.listen();

  process.env.NODE_ENV = 'development';

  // Run loop
  function restart(err) {
    if (!err) gulp.start('start', restart);
  }
  restart();
});

gulp.task('start', $.shell.task('electron .'));

gulp.task('build', ['typescript', 'copy', 'stylus']);
gulp.task('default', ['watch']);
