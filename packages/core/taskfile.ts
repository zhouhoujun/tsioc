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
            { src: 'src/**/*.ts', test: 'test/**/*.ts', clean: ['../../dist/core/lib'], dist: '../../dist/core/lib', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/core/bundle'], outputFile: '../../dist/core/bundle/core.umd.js', format: 'umd', uglify: false, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/core/fesm5'], outputFile: '../../dist/core/fesm5/core.js', format: 'cjs', uglify: false, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/core/fesm2015'], outputFile: '../../dist/core/fesm2015/core.js', format: 'cjs', annotation: true, tsconfig: './tsconfig.es2015.json' }
        ]
    }
})
export class CoreBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(CoreBuilder);
}
