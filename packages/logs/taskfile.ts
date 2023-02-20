import { Workflow, Task } from '@tsdi/activities';
import { PackModule, LibPackBuilderOption } from '@tsdi/pack';
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';

@Task({
    deps: [,
        PackModule,
        ServerActivitiesModule
    ],
    baseURL: __dirname,
    template: <LibPackBuilderOption>{
        activity: 'libs',
        outDir: '../../dist/logs',
        src: 'src/**/*.ts',
        test: 'test/**/*.ts',
        clean: ['../../dist/logs/src/**/*.js', '../../dist/logs/es2015'],
        annotation: true,
        bundles: [
            { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundles', outputFile: 'logs.umd.js', format: 'umd', uglify: true },
            { target: 'es2015', module: 'es2020', moduleName: ['fesm2015'], outputFile: 'logs.js', format: 'es', exportAs: 'node' },
            { target: 'es2020', module: 'es2020', moduleName: ['fesm2020', 'esm2020'], outputFile: 'logs.js', format: 'es', exportAs: 'default' }
        ]
    }
})
export class LogsBuilder {
}
