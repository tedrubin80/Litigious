module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current'
        },
        modules: 'auto' // Let Babel handle module transformation
      }
    ],
    [
      '@babel/preset-react',
      {
        runtime: 'automatic' // Use automatic JSX runtime
      }
    ]
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current'
            },
            modules: 'commonjs' // Use CommonJS for Jest
          }
        ],
        '@babel/preset-react'
      ]
    }
  },
  plugins: []
};