module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/api/**/*.spec.ts'],
    setupFiles: ['./jest.setup.js'],
    globals: {
        'ts-jest': {
            isolatedModules: true
        }
    }
};
