module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/find/*.ts', '!src/**/*.d.ts'],
  moduleNameMapper: {
    '^color-name$': '<rootDir>/node_modules/color-name',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};