var gulp = require('gulp'),
  del = require('del'),
  source = require('vinyl-source-stream'),
  babelify = require('babelify'),
  browserify = require('browserify'),
  browserSync = require('browser-sync'),
  merge = require('merge-stream')(),
  plugins = require('gulp-load-plugins')(),
  reload = browserSync.reload;

var paths = {
  css: ['dist/css/**/*.css'],
  js: ['dist/js/vendor.js', 'dist/js/**/*.js'],
  sass: ['src/style/**/*.scss'],
  react: ['src/app/**/*.+(js|jsx)'],
  vendorJs: [
    'src/bower_components/react/react.js',
    'src/bower_components/react/react-dom.js',
    'src/bower_components/jquery/dist/jquery.js',
    'src/bower_components/tether/dist/js/tether.js',
    'src/bower_components/bootstrap/dist/js/bootstrap.js'
  ],
  vendorScss: [
    'src/bower_components/bootstrap/scss/bootstrap.scss'
  ]
};

var onError = function(err) {
  plugins.notify.onError({
    title: "Error",
    message: "<%= error %>",
  })(err);
  this.emit('end');
};

var plumberOptions = {
  errorHandler: onError,
};

// Lint JS/JSX files
gulp.task('eslint', ['clean'], function() {
  return gulp.src(paths.react)
    .pipe(plugins.eslint({
      baseConfig: {
        'ecmaFeatures': {
          'jsx': true
        }
      },
      parser: 'babel-eslint',
      rules: {
        'quotes': [1, 'single'],
        'semi': [1, 'always']
      }
    }))
    .pipe(plugins.eslint.format())
    .pipe(plugins.eslint.failAfterError());
});

function copyVendor(src, dest) {
  var jsName = src.substr((src.lastIndexOf('/') + 1));
  return gulp.src(src)
    .pipe(plugins.newer(dest + '/' + jsName))
    .pipe(gulp.dest(dest));
}

// Copy vendor js from bower to js/vendor
gulp.task('copy-vendor-js', ['clean'], function() {
  for (var vendor of paths.vendorJs) {
    merge.add(copyVendor(vendor, 'src/vendor/js'));
  }
  return merge.isEmpty() ? null : merge;
});

// Concat dist/js/vendor/* to dist/js/vendor.js
gulp.task('concat-vendor-js', ['copy-vendor-js', 'clean'], function() {
  return gulp.src([
      'src/vendor/js/jquery.js',
      'src/vendor/js/tether.js',
      'src/vendor/js/bootstrap.js',
      'src/vendor/js/react.js',
      'src/vendor/js/react-dom.js',
      'src/vendor/js/*.js'
    ])
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.concat('vendor.js'))
    .pipe(plugins.sourcemaps.write('./'))
    .pipe(gulp.dest('dist/js'));
});

// Concatenate jsFiles.vendor and jsFiles.source into one JS file.
// Run copy-react and eslint before concatenating
gulp.task('concat', ['eslint', 'clean'], function() {
  return browserify({
    entries: 'src/app/app.js',
    extensions: ['.jsx', '.js'],
    debug: true
  })
  .transform(babelify)
.bundle()
.pipe(source('bundle.js'))
    .pipe(gulp.dest('dist/js'));
});

// Compile Sass to CSS
gulp.task('sass', ['clean'], function() {
  var autoprefixerOptions = {
    browsers: ['last 2 versions'],
  };

  var filterOptions = '**/*.css';

  var reloadOptions = {
    stream: true,
  };

  var sassOptions = {
    includePaths: [

    ]
  };

  return gulp.src('src/style/**/*.scss')
    .pipe(plugins.plumber(plumberOptions))
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.sass(sassOptions))
    .pipe(plugins.autoprefixer(autoprefixerOptions))
    .pipe(plugins.sourcemaps.write('./'))
    .pipe(gulp.dest('dist/css'))
    .pipe(plugins.filter(filterOptions))
    .pipe(reload(reloadOptions));
});

gulp.task('copy-html', ['clean', 'sass', 'concat', 'concat-vendor-js'], function() {
  return gulp.src('src/pages/**/*.html')
    .pipe(plugins.inject(
      gulp.src(paths.css, {
        read: false
      }), {
        ignorePath: 'dist'
      })).pipe(plugins.inject(
      gulp.src(paths.js, {
        read: false
      }), {
        ignorePath: 'dist'
      }))
    .pipe(gulp.dest('dist'));
});

gulp.task('browsersync', function() {
  browserSync({
    server: {
      baseDir: 'dist'
    },
    open: false,
    online: false,
    notify: false,
  });
});

gulp.task('clean', function() {
  return del(['dist']);
});

gulp.task('build', ['clean', 'sass', 'concat-vendor-js', 'copy-html', 'concat']);
gulp.task('default', ['build', 'browsersync']);
