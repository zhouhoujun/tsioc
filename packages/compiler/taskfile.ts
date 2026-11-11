import { runCompiler } from './src';

if (process.cwd() === __dirname) {
    runCompiler({
        src: 'src/**/*.ts',
        outDir: '../../dist/compiler',
        target: 'es2020',
        format: 'cjs',
        platform: 'node',
        declaration: true,
        sourcemap: true,
        aot: true
    });
}
