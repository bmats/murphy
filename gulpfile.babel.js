import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import Jasmine from 'jasmine';
import SpecReporter from 'jasmine-spec-reporter';

const $ = gulpLoadPlugins();

const paths = {
  typescript: 'src/**/*',
  static: ['static/**/*', '!static/styles/*'],
  styles: 'static/styles/*',
  build: './build',
  spec: 'spec/**/*.ts'
};

function logError(err) {
  $.util.log(err.toString());
}

gulp.task('typescript', () => {
  return gulp.src(paths.typescript)
    .pipe($.typescript({
      target: 'es5',
      module: 'commonjs',
      jsx: 'react'
    })) // errors are logged
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
    .pipe(gulp.dest(paths.build + '/static/styles'))
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

gulp.task('test-typescript', () => {
  return gulp.src(paths.spec)
    .pipe($.typescript({
      target: 'es5',
      module: 'commonjs',
      jsx: 'react'
    })) // errors are logged
    .pipe(gulp.dest(paths.build + '/spec'));
});

gulp.task('test', ['typescript', 'test-typescript'], () => {
  const runner = new Jasmine();
  runner.configureDefaultReporter({ print: () => {} });
  runner.jasmine.getEnv().addReporter(new SpecReporter({
    displayStacktrace: 'summary',
    displayPendingSpec: true
  }));
  runner.loadConfigFile('spec/support/jasmine.json');
  runner.execute();
});

gulp.task('start', $.shell.task('electron .'));

gulp.task('build', ['typescript', 'copy', 'stylus']);
gulp.task('default', ['watch']);
