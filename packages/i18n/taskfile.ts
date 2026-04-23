import { Workflow } from '@tsdi/activities';
import { CompilerModule } from '@tsdi/compiler';

if (process.cwd() === __dirname) {
    Workflow.run(CompilerModule, {
        baseURL: __dirname,
        src: 'src/**/*.ts',
        outDir: '../../dist/i18n',
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