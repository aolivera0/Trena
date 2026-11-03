import { defineConfig } from 'vitest/config'

// Tests de reglas de Firestore: corren contra el emulador, uno a la vez.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 15000,
  },
})
