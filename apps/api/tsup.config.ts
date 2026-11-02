import { defineConfig } from 'tsup';

// Tùy chọn noExternal không có trên dòng lệnh của tsup, nên khai báo ở đây.
export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  noExternal: ['@miu/tarot-core', '@miu/tarot-data', '@miu/content-policy']
});
