import { PackModule, LibPackBuilderOption } from '@tsdi/pack';
import { Workflow, Task } from '@tsdi/activities';
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';

@Task({
    deps: [
        PackModule,
        ServerActivitiesModule
    ],
    baseURL: __dirname,
    template: <LibPackBuilderOption>{
        activity: 'libs',
        outDir: '../../dist/platform-browser',
        tasks: [
            { src: 'src/**/*.ts', test: 'test/**/*.ts', moduleName: 'esm5', moduleFolder: 'lib', dtsMain: 'index.d.ts', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', moduleName: 'main', moduleFolder: 'bundle', fileName: 'platform-browser.umd.js', format: 'umd', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', moduleName: 'fesm5', fileName: 'platform-browser.js', format: 'cjs', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', moduleName: 'fesm2015', fileName: 'platform-browser.js', format: 'cjs', annotation: true, tsconfig: './tsconfig.es2015.json' },
            { input: 'src/index.ts', moduleName: 'fesm2017', fileName: 'platform-browser.js', format: 'cjs', annotation: true, tsconfig: './tsconfig.es2017.json' }
        ]
    }
})
export class PfBrowserBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(PfBrowserBuilder);
}

