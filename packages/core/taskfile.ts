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
        clean: ['../../dist/core/src/**/*.js', '../../dist/core/es2015'],
        annotation: false,
        bundles: [
            { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundles', outputFile: 'core.umd.js', format: 'umd', uglify: true },
            { target: 'es2015', module:'es2020', moduleName: ['fesm2015'], outputFile: 'core.js', format: 'es', exportAs: 'node' },
            { target: 'es2020', module:'es2020', moduleName: ['fesm2020', 'esm2020'], outputFile: 'core.js', format: 'es', exportAs: 'default' }
        ]
    }
})
export class CoreBuilder {
}
