const path = require('path')

module.exports = {
    entry: {
        main: './src/main.js',
    },
    output: {
        path: path.join(__dirname, 'extension', 'main'),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    devtool: 'source-map',
}
