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
        outDir: '../../dist/core',
        src: 'src/**/*.ts',
        test: 'test/**/*.ts',
        annotation: false,
        bundles: [
            { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundle', outputFile: 'core.umd.js', format: 'umd', uglify: true },
            { target: 'es2015', module:'es2020', input: 'es2015/index.js', moduleName: ['fesm2015', 'esm2015'], outputFile: 'core.js', format: 'es' }
        ]
    }
})
export class CoreBuilder {
}
