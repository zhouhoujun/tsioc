import { Workflow } from '@tsdi/activities';
import { CompilerModule } from '@tsdi/compiler';

if (process.cwd() === __dirname) {
    Workflow.run(CompilerModule, {
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
