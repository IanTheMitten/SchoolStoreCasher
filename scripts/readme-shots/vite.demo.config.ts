// Runs the app on port 3100 with its disk mirror pointed at a throwaway folder, so the
// demo data never touches data/db.json. Different port = different browser origin, so the
// real IndexedDB on port 3000 is untouched too.
import { defineConfig } from 'vite';
import base from '../../vite.config';
import { fileDbPlugin } from '../../vite-plugin-file-db';

const demoDir = process.env.DEMO_DATA_DIR;
if (!demoDir) throw new Error('DEMO_DATA_DIR is not set; run scripts/readme-shots/run.sh');

const plugins = (base.plugins || []).filter((p: any) => p?.name !== 'schoolstore-file-db');

export default defineConfig({
  ...base,
  plugins: [...plugins, fileDbPlugin({ dir: demoDir })],
  server: { port: 3100, strictPort: true, open: false, watch: { ignored: ['**/data/**'] } },
});
