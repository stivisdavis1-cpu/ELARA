import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // La base distante (pooler Supabase) ajoute plusieurs secondes par
    // aller-retour : les délais par défaut (5 s de test / 10 s de hook)
    // étaient trop justes et faisaient échouer des suites saines.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
