import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'tests/**', 'scripts/**'],
  },
  {
    ...eslint.configs.recommended,
    files: ['src/**/*.ts'],
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['src/**/*.ts'],
  })),
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
)
