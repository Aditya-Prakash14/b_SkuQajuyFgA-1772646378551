// eslint-config-next v16 ships a native flat config array — spread it directly.
// (Wrapping it in FlatCompat causes a circular-structure crash.)
import next from 'eslint-config-next'

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      // Unused v0/shadcn scaffolding — no app code imports these (verified).
      // Kept only so the primitives are available if ever needed; not linted
      // because we don't maintain them. Safe to delete entirely.
      'components/ui/**',
      'hooks/**',
    ],
  },
  ...next,
  {
    rules: {
      // Local, unoptimized image assets — next/image adds nothing here.
      '@next/next/no-img-element': 'off',

      // React 19's new rule. Reading localStorage / gating on mount CANNOT be
      // done during render in an SSR app — setState-in-effect is the only
      // correct pattern there (cart + city hydration, mounted guards).
      // Downgraded to a warning so genuine cases still surface in review.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // @typescript-eslint is only registered for TS files by next/typescript,
    // so its rules must be scoped to the same files.
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
