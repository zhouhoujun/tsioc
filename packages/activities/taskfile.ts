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
            { src: 'src/**/*.ts', test: 'test/**/*.ts', clean: '../../dist/activities/lib', dist: '../../dist/activities/lib', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/activities/bundles', outputFile: '../../dist/activities/bundles/activities.umd.js', format: 'umd', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/activities/fesm5', outputFile: '../../dist/activities/fesm5/activities.js', format: 'cjs', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/activities/fesm2015', outputFile: '../../dist/activities/fesm2015/activities.js', format: 'cjs',  annotation: true, tsconfig: './tsconfig.es2015.json' },
            { input: 'src/index.ts', clean: '../../dist/activities/fesm2017', outputFile: '../../dist/activities/fesm2017/activities.js', format: 'cjs',  annotation: true, tsconfig: './tsconfig.es2017.json' }
        ]
    }
})
export class ActivitiesBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(ActivitiesBuilder);
}
