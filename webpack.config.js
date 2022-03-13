
const path = require('path');
const fs = require('fs');

module.exports = {
  entry: "./src/index.ts",
  output: {
    filename: "./app.js",
  },
  devtool: "source-map",
  mode: "development",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
      },
      {
        test: /\.wasm$/,
        type: "javascript/auto",
        loader: "file-loader",
        options: {
          publicPath: "../",
          outputPath: "../",
        },
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js", "wasm"],
    fallback: {
      fs: false,
      child_process: false,
      path: false,
      crypto: false,
    }
  }
};