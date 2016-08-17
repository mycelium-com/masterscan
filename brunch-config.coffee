exports.config =
# Note that the usual app.js is commented out.
# This isn't needed when using Browserify.
  files:
    javascripts:
      joinTo:
#       'javascripts/app.js': /^app/
        'javascripts/vendor.js': /^(vendor|bower_components)/
        'test/javascripts/test.js': /^test\/(?!vendor)/
        'test/javascripts/test-vendor.js': /^test\/(?=vendor)/

# Again, browserify provides these.
  modules:
    wrapper: false
    definition: false
  server:
    hostname: "0.0.0.0"

  plugins:
    browserify:
# A string of extensions that will be used in Brunch and for browserify.
# Default: js json coffee ts jsx hbs jade.
      extensions: """
      js coffee
      """

      bundles:
        'javascripts/app.js':
# Passed to browserify.
          entry: 'app/initialize.js'

# Anymatch, as used in Brunch.
          matcher: /^app/

# Direct access to the browserify bundler to do anything you need.
          onBrowserifyLoad: (bundler) -> console.log 'onWatchifyLoad'

# Any files watched by browserify won't be in brunch's regular
# pipeline. If you do anything before your javascripts are compiled,
# now's the time.
          onBeforeBundle: (bundler) -> console.log 'onBeforeBundle'

# Any files watched by browserify won't be in brunch's regular
# pipeline. If you do anything after your javascripts are compiled,
# now's the time.
          onAfterBundle: (error, bundleContents) -> console.log 'onAfterBundle'

# Any options to pass to `browserify`.
# `debug` will be set to `!production` if not already defined.
# `extensions` will be set to a proper list of
# `plugins.browserify.extensions`
          instanceOptions: {}

  npm:
    enabled: false