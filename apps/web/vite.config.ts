import { defineConfig, searchForWorkspaceRoot } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { fileURLToPath, URL } from 'node:url'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

const config = defineConfig({
  server: {
    port: 3000,
    fs: {
      allow: [
        searchForWorkspaceRoot(rootDir),
        fileURLToPath(new URL('../..', import.meta.url)),
      ],
    },
  },
  optimizeDeps: {
    exclude: ['@lms/types', '@lms/validators', '@lms/config'],
  },
  ssr: {
    noExternal: ['@lms/types', '@lms/validators', '@lms/config'],
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '#': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
})

export default config
