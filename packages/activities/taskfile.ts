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
        outDir: '../../dist/activities',
        src: 'src/**/*.ts',
        test: 'test/**/*.ts',
        bundles: [
            { moduleName: 'esm5', moduleFolder: 'lib', dtsMain: 'index.d.ts', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', moduleName: 'main', moduleFolder: 'bundles', fileName: 'activities.umd.js', format: 'umd', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', moduleName: ['esm5', 'fesm5'], moduleFolder: 'fesm5', fileName: 'activities.js', format: 'cjs', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', moduleName: ['es2015', 'fesm2015'], moduleFolder: 'fesm2015', fileName: 'activities.js', format: 'cjs', annotation: true, tsconfig: './tsconfig.es2015.json' },
            { input: 'src/index.ts', moduleName: 'fesm2017', fileName: 'activities.js', format: 'cjs', annotation: true, tsconfig: './tsconfig.es2017.json' }
        ]
    }
})
export class ActivitiesBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(ActivitiesBuilder);
}
