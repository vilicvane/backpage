import commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';

export default {
  input: 'bld/frontpage/main.js',
  output: {
    file: 'bld/frontpage/bundled.js',
    format: 'esm',
  },
  plugins: [commonjs(), nodeResolve()],
};
