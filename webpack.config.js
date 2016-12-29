var webpack = require('webpack');
var merge = require('webpack-merge');
var autoprefixer = require('autoprefixer');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var path = require('path');
var qs = require('qs');

var pkg = require('./package.json');

var TARGET = process.env.npm_lifecycle_event;
var DEV_MODE = TARGET === 'dev' || TARGET === 'build' || TARGET === 'start:client' || TARGET === 'dev:tomcat' || TARGET === 'build:tomcat' || TARGET === 'start:client:tomcat'
var RELEASE_MODE = TARGET === 'release'
var TOMCAT_ENABLED = TARGET === 'dev:tomcat' || TARGET === 'build:tomcat' || TARGET === 'start:client:tomcat'

var NODE_PATH = path.join(__dirname, 'node_modules');
var SOURCE_PATH = path.join(__dirname, 'src');

var address = 'localhost';
var port = 8000;
var apiServerPort = 8010;

var apiServer = {
  address: address,
  port: apiServerPort
};

var common = {
  context: SOURCE_PATH,
  entry: {
    app: [
      // Main entry point.
      './index.jsx'
    ]
  },
  output: {
    filename: '[name].js',
    pathInfo: true
  },
  resolve: {
    extensions: ['', '.js', '.jsx'],
    // All imports from external files should fallback
    // to this project's Node module directory.
    fallback: NODE_PATH
  },
  resolveLoader: {
    // All Webpack loaders needed for external files should fallback
    // to this project's Node module directory.
    fallback: NODE_PATH
  },
  plugins: [
    // Define global variables that will be replaced inline during compile.
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': RELEASE_MODE ? '"production"' : '"development"'
    }),
    // Create `index.html` with appropriate references to generated files.
    new HtmlWebpackPlugin({
      title: pkg.name,
      inject: true,
      template: path.join(SOURCE_PATH, 'index.html')
    })
  ],
  module: {
    loaders: [
      {
        test: /\.html$/,
        loader: 'file?name=[name].[ext]'
      },
      {
        test: /\.svg$/,
        loader: 'raw'
      },
      {
        test: /\.png$/,
        loader: 'url-loader'
      },
      {
        test: /\.json$/,
        loader: 'json'
      }
    ]
  },
  postcss: function() {
    return [autoprefixer({browsers: ['> 5% in US', 'last 4 versions', 'Firefox ESR']})]
  }
};

if(!RELEASE_MODE) {
  module.exports = merge.smart(common, {
    output: {
      path: path.join(__dirname, 'build'),
    },
    // Set loaders to debug mode.
    debug: true,
    // Generate source maps, so it's easier to find errors in code.
    devtool: '#source-map',
    // WebpackDevServer config.
    devServer: {
      address: address,
      hot: true,
      noInfo: true,
      port: port,
      url: makeUrl(address, port),
      contentBase: 'build',
      proxy: makeProxy(),
      historyApiFallback: true
    },
    apiServer: apiServer,
    eslint: {
      configFile: '.eslintrc',
      emitError: true
    },
    plugins: [
      // Ignore injecting code with errors.
      new webpack.NoErrorsPlugin()
    ],
    module: {
      preLoaders: [
        {
          test: /\.(js|jsx)$/,
          loader: 'eslint-loader'
        }
      ],
      loaders: [
        makeCSSLoader('[name]-[local]_[hash:base64:5]'),
        makeJSLoader(true)
      ]
    }
  });
}

if(RELEASE_MODE) {
  module.exports = merge.smart(common, {
    output: {
      filename: '[name].' + pkg.version + '.js',
      path: path.join(__dirname, 'release')
    },
    plugins: [
      // Minifies code.
      new webpack.optimize.UglifyJsPlugin({
        compressor: {
          warnings: false
        }
      })
    ],
    module: {
      loaders: [
        makeCSSLoader('[hash:base64:5]'),
        makeJSLoader(false),
        {
          test: /\.svg$/,
          loaders: [
            'raw',
            'svgo'
          ]
        }
      ]
    }
  });
}

function makeCSSLoader(localIdentName) {
  return {
    test: /\.(css|less)$/,
    loaders: [
      'style',
      'css?modules&localIdentName=' + localIdentName + '&-autoprefixer',
      'postcss',
      'less'
    ]
  };
}

function makeJSLoader(isHot) {
  // Transform Babel config to Webpack query string.
  // This ensures Babel will use this config when compiling external
  // source code, instead of only using the config for internal source code.
  var babelrc = require('fs').readFileSync(path.join(__dirname, '.babelrc'), 'utf8');
  var babelQuery = '?' + qs.stringify(
    JSON.parse(babelrc),
    {
      arrayFormat: 'brackets',
      encode: false
    }
  );

  var loader = {
    test: /\.(js|jsx)$/,
    // Ignore processing any node modules except for explicit ones.
    // This speeds development and prevents potential issues.
    include: [
      path.resolve(__dirname, "src"),
      path.resolve(__dirname, "node_modules/iu-ess-ux-components"),
      path.resolve(__dirname, "node_modules/react-menu")
    ],
    loaders: [
      'babel' + babelQuery
    ]
  };

  if(isHot) {
    loader.loaders.unshift('react-hot');
  }

  return loader;
}

function rewriteUrl(replacePath) {
    return function(req, opt) {  // gets called with request and proxy object
        var query = getQueryString(req)
        if (TOMCAT_ENABLED) {
          query += (query ? '&' : '?') + '__sjloop=true'
        }
        var endpoint = opt.path.exec(req.path)
        if (endpoint) {
          req.url = replacePath + endpoint[1] + query
        }
        console.log('rewriting ', req.originalUrl, req.url)
    };
};

function makeProxy() {
  // WebpackDevServer config.
  return [{
    path: new RegExp('/api/(.*)'),
    rewrite: rewriteUrl(TOMCAT_ENABLED ? '/sisaadm-dev/api/' : '/'),
    target: makeUrl(apiServer.address, TOMCAT_ENABLED ? 8080 : apiServer.port)
  },
  {
    path: new RegExp('/(.+)(/.+\..+)'),
    rewrite: function(req, opt) {
      var resource = opt.path.exec(req.path)
      if (resource) {
        req.url = resource[2]
        console.log('getting resource ' + req.url)
      }
    },
    target: makeUrl(address, port)
  }]
}

function makeUrl(address, port) {
  return 'http://' + address + ':' + port;
}

function getQueryString(req) {
  var queryIndex = req.url.indexOf('?')
  return queryIndex >= 0 ? req.url.substr(queryIndex) : ''
}
