// eslint-config-next v16 ships a native flat config array — spread it directly.
import next from 'eslint-config-next'

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...next,
  {
    rules: {
      '@next/next/no-img-element': 'off',

      // React 19's new rule. Mount guards (hydration-safe rendering) and
      // syncing server-refreshed props into optimistic local state require
      // setState in an effect. Warn so real cases still surface in review.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
]

export default config
