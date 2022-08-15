import { build } from 'esbuild';

const options = {
  entryPoints: ['../src/index.ts'],
  minify: false,
  bundle: true,
  outfile: '../dist/index.js',
};

build(options).catch((err) => {
  process.stderr.write(err.stderr);
  process.exit(1);
});
