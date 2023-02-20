import { Workflow, Task } from '@tsdi/activities';
import { PackModule, LibPackBuilderOption } from '@tsdi/pack';
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';
import { AfterInit } from '@tsdi/components';

@Task({
    deps: [
        PackModule,
        ServerActivitiesModule
    ],
    baseURL: __dirname,
    template: <LibPackBuilderOption>{
        activity: 'libs',
        outDir: '../../dist/platform-server-activities',
        src: 'src/**/*.ts',
        test: 'test/**/*.ts',
        clean: ['../../dist/platform-server-activities/src/**/*.js', '../../dist/platform-server-activities/es2015'],
        annotation: true,
        bundles: [
            { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundles', outputFile: 'platform-server-activities.js', format: 'cjs' },
            { target: 'es2015', module: 'es2020', moduleName: ['fesm2015'], outputFile: 'platform-server-activities.js', format: 'es', exportAs: 'node' },
            { target: 'es2020', module: 'es2020', moduleName: ['fesm2020', 'esm2020'], outputFile: 'platform-server-activities.js', format: 'es', exportAs: 'default' }
        ]
    }
})
export class PfServerActivitiesBuilder implements AfterInit {
    onAfterInit(): void | Promise<void> {
        console.log('pack build has inited...')
    }
}

