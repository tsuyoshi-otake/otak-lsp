/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/shared/__tests__', '<rootDir>/server/src', '<rootDir>/client/src'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'shared/src/**/*.ts',
    'server/src/**/*.ts',
    'client/src/**/*.ts',
    '!**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};
