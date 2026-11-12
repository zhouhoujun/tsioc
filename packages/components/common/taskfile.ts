import { runCompiler as runCompilerActivity } from '@tsdi/compiler';

if (process.cwd() === __dirname) {
    runCompilerActivity({
        baseURL: __dirname,
        src: ['src/**/*.ts', 'tabs/**/*.ts', 'tab-bar/**/*.ts', 'dialog/**/*.ts', 'toast/**/*.ts', 'alert/**/*.ts', 'menu-bar/**/*.ts', 'markdown/**/*.ts', 'select/**/*.ts', 'list/**/*.ts', 'keymap/**/*.ts', 'status-list/**/*.ts', 'panel/**/*.ts', 'pager/**/*.ts', 'syntax/**/*.ts', 'layout/**/*.ts', 'grid/**/*.ts', 'dynamic-form/**/*.ts'],
        outDir: '../../../dist/components/common',
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
