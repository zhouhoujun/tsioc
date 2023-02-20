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
        outDir: '../../dist/ioc',
        src: 'src/**/*.ts',
        test: 'test/**/*.ts',
        clean: ['../../dist/ioc/src/**/*.js', '../../dist/ioc/es2015'],
        annotation: true,
        bundles: [
            { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundles', outputFile: 'ioc.umd.js', format: 'umd', uglify: true },
            { target: 'es2015', module:'es2020', moduleName: ['fesm2015'], outputFile: 'ioc.js', format: 'es', exportAs: 'node' },
            { target: 'es2020', module:'es2020', moduleName: ['fesm2020', 'esm2020'], outputFile: 'ioc.js', format: 'es', exportAs: 'default' }
        ]
    }
})
export class IocBuilder {
}
