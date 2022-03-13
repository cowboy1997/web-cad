
module.exports = {
  entry: "./src/index.ts",
  output: {
    filename: "./app.js",
  },
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
        loader: "file-loader"
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