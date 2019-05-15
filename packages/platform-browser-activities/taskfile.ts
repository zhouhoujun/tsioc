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
            { src: 'src/**/*.ts', test: 'test/**/*.ts', clean: ['../../dist/platform-browser-activities/lib'], dist: '../../dist/platform-browser-activities/lib', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/platform-browser-activities/bundle'], outputFile: '../../dist/platform-browser-activities/bundle/platform-browser-activities.umd.js', format: 'umd', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/platform-browser-activities/fesm5'], outputFile: '../../dist/platform-browser-activities/fesm5/platform-browser-activities.js', format: 'cjs', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/platform-browser-activities/fesm2015'], outputFile: '../../dist/platform-browser-activities/fesm2015/platform-browser-activities.js', format: 'cjs', tsconfig: './tsconfig.es2015.json' }
        ]
    }
})
export class PfBrowerActiveBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(PfBrowerActiveBuilder);
}
