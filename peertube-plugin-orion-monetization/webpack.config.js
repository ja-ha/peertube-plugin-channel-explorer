const path = require("path")

const clientFiles = [
  'video-watch-client-plugin.js',
  'video-edit-client-plugin.js',
  'common-client-plugin.js'
]

let config = clientFiles.map(f => ({
  entry: "./client/" + f,

  experiments: {
    outputModule: true
  },

  output: {
    path: path.resolve(__dirname, "./dist"),
    filename: "./" + f,
    library: {
      type: "module"
    }
  }
}))

module.exports = config
