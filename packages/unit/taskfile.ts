import { Workflow, Task } from '@tsdi/activities';
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';
import { PackModule, LibPackBuilderOption } from '@tsdi/pack';

@Task({
    deps: [
        PackModule,
        ServerActivitiesModule
    ],
    baseURL: __dirname,
    template: <LibPackBuilderOption>{
        activity: 'libs',
        src: 'src/**/*.ts',
        outDir: '../../dist/unit',
        test: 'test/**/*.ts',
        annotation: true,
        bundles: [
            { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundle', outputFile: 'unit.umd.js', format: 'umd', uglify: true },
            { input: 'src/index.js', moduleName: ['fesm5', 'esm5'], outputFile: 'unit.js', format: 'cjs' },
            { target: 'es2017', input: 'es2017/index.js', moduleName: ['fesm2017', 'esm2017'], outputFile: 'unit.js', format: 'cjs' }
        ]
    }
})
export class UnitBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(UnitBuilder);
}
