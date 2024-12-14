module.exports = {
  extension: ['ts'],
  package: './package.json',
  spec: ['./src/**/test.ts'],
  timeout: '30000',
  require: ['ts-node/register', 'tsconfig-paths/register'],
};
