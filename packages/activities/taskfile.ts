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
            { src: 'src/**/*.ts', test: 'test/**/*.ts', dist: '../../dist/activities/lib', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', dist: '../../dist/activities/bundles', outputFile: 'activities.umd.js', format: 'umd', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', dist: '../../dist/activities/fesm5', outputFile: 'activities.js', format: 'cjs', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', dist: '../../dist/activities/fesm2015', outputFile: 'activities.js', format: 'cjs',  annotation: true, tsconfig: './tsconfig.es2015.json' },
            { input: 'src/index.ts', dist: '../../dist/activities/fesm2017', outputFile: 'activities.js', format: 'cjs',  annotation: true, tsconfig: './tsconfig.es2017.json' }
        ]
    }
})
export class ActivitiesBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(ActivitiesBuilder);
}
