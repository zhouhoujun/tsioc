import { AfterInit } from '@tsdi/components';
import { Workflow, Task } from '@tsdi/activities';
import { PackModule, LibPackBuilderOption } from '@tsdi/pack';
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';

@Task({
    deps: [
        PackModule,
        ServerActivitiesModule
    ],
    baseURL: __dirname,
    template: <LibPackBuilderOption>{
        activity: 'libs',
        outDir: '../../dist/platform-server-logs',
        src: 'src/**/*.ts',
        test: 'test/**/*.ts',
        clean: ['../../dist/platform-server-logs/src/**/*.js', '../../dist/platform-server-logs/es2015'],
        annotation: true,
        bundles: [
            { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundles', outputFile: 'platform-server-logs.js', format: 'cjs' },
            { target: 'es2015', module: 'es2020', moduleName: ['fesm2015'], outputFile: 'platform-server-logs.js', format: 'es', exportAs: 'node' },
            { target: 'es2020', module: 'es2020', moduleName: ['fesm2020', 'esm2020'], outputFile: 'platform-server-logs.js', format: 'es', exportAs: 'default' }
        ]
    }
})
export class PfServerLogsBuilder implements AfterInit {
    onAfterInit(): void | Promise<void> {
        console.log('pf build has inited...')
    }
}
