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
        tasks: [
            { src: 'src/**/*.ts', test: 'test/**/*.ts', clean: '../../dist/platform-browser/lib', dist: '../../dist/platform-browser/lib', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/platform-browser/bundle', outputFile: '../../dist/platform-browser/bundle/platform-browser.umd.js', format: 'umd', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/platform-browser/fesm5', outputFile: '../../dist/platform-browser/fesm5/platform-browser.js', format: 'cjs', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/platform-browser/fesm2015', outputFile: '../../dist/platform-browser/fesm2015/platform-browser.js', format: 'cjs', annotation: true, tsconfig: './tsconfig.es2015.json' },
            { input: 'src/index.ts', clean: '../../dist/platform-browser/fesm2017', outputFile: '../../dist/platform-browser/fesm2017/platform-browser.js', format: 'cjs', annotation: true, tsconfig: './tsconfig.es2017.json' }
        ]
    }
})
export class PfBrowserBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(PfBrowserBuilder);
}

