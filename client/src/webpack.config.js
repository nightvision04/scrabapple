// webpack.config.js
const path = require('path');

module.exports = {


  module: {
    rules: [

      {
        test: /\.(png|jpe?g|gif|svg)$/i, // Match common image file extensions
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192, // Convert images < 8kb to base64 strings
              name: 'images/[name].[hash:7].[ext]', // Output path for images
              esModule: false, // Add this line to fix the issue
            },
          },
        ],
      },
    ],
  },
};