export const config = {
    verbose: true,
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testMatch: [
        '<rootDir>/**/__test__/**/*.(spec|test).{ts,tsx}',
        '<rootDir>/**/src/**/*.(spec|test).{ts,tsx}',
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
    collectCoverageFrom: [
        '<rootDir>/**/*.{ts,tsx}',
        '!**/node_modules/**',
        '!**/dist/**',
    ],
    coverageDirectory: '<rootDir>/coverage',
};
