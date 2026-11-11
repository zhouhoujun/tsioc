import { runCompiler as runCompilerActivity } from '@tsdi/compiler';

if (process.cwd() === __dirname) {
    runCompilerActivity({
        baseURL: __dirname,
        src: 'src/**/*.ts',
        outDir: '../../dist/ioc',
        options: {
            target: 'es2020',
            module: 'es2020',
            format: 'esm',
            declaration: true,
            sourceMap: true,
            strict: true,
            skipLibCheck: true,
            esModuleInterop: true,
            experimentalDecorators: true,
            emitDecoratorMetadata: true
        }
    });
}
