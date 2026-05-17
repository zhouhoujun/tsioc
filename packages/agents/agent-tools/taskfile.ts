import { Workflow } from '@tsdi/activities';
import { CompilerModule } from '@tsdi/compiler';

if (process.cwd() === __dirname) {
    Workflow.run(CompilerModule, {
        baseURL: __dirname,
        src: ['src/**/*.ts', 'files/**/*.ts', 'web/**/*.ts', 'utility/**/*.ts', 'planning/**/*.ts', 'memory/**/*.ts', 'http/**/*.ts', 'registry/**/*.ts', 'scheduling/**/*.ts', 'terminal/**/*.ts'],
        outDir: '../../dist/agent-tools',
        options: {
            target: 'es2020',
            module: 'commonjs',
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
