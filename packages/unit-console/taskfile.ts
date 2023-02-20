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
        outDir: '../../dist/unit-console',
        src: 'src/**/*.ts',
        test: 'test/**/*.ts',
        clean: ['../../dist/unit-console/src/**/*.js', '../../dist/unit-console/es2015'],
        annotation: true,
        bundles: [
            { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundles', outputFile: 'unit-console.js', format: 'cjs' },
            { target: 'es2015', module: 'es2020', moduleName: ['fesm2015'], outputFile: 'unit-console.js', format: 'es', exportAs: 'node' },
            { target: 'es2020', module: 'es2020', moduleName: ['fesm2020', 'esm2020'], outputFile: 'unit-console.js', format: 'es', exportAs: 'default' }
        ]
    }
})
export class UnitConsoleBuilder implements AfterInit {
    onAfterInit(): void | Promise<void> {
        console.log('pack build has inited...')
    }
}

