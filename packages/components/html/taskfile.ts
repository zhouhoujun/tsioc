import { runCompiler as runCompilerActivity } from '@tsdi/compiler';

if (process.cwd() === __dirname) {
    runCompilerActivity({
        baseURL: __dirname,
        src: 'src/**/*.ts',
        outDir: '../../../dist/components/html',
        options: {
            target: 'es2020',
            module: 'commonjs',
            declaration: true,
            sourceMap: true,
            strict: true,
            skipLibCheck: true,
            experimentalDecorators: true,
            emitDecoratorMetadata: true
        }
    });
}
