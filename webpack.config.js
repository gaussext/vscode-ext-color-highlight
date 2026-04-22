const baseConfig = {
  entry: './src/main.ts',
  externals: {
    'vscode': 'vscode'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  }
};

const nodeConfig = {
  ...baseConfig,
  target: 'node',
  output: {
    libraryTarget: 'commonjs2',
    filename: 'extension-node.js',
    devtoolModuleFilenameTemplate: '[absolute-resource-path]'
  }
};

const webConfig = {
  ...baseConfig,
  target: 'webworker',
  output: {
    libraryTarget: 'commonjs2',
    filename: 'extension-web.js',
    devtoolModuleFilenameTemplate: '[absolute-resource-path]'
  },
  resolve: {
    ...baseConfig.resolve,
    fallback: {
      'path': require.resolve('path-browserify'),
      'fs': false
    }
  }
};

module.exports = [nodeConfig, webConfig];

if (process.env.NODE_ENVIRONMENT !== 'production') {
  module.exports.devtool = 'source-map';
}