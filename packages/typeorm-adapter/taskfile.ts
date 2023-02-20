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
        outDir: '../../dist/typeorm-adapter',
        src: 'src/**/*.ts',
        test: false,
        clean: ['../../dist/typeorm-adapter/src/**/*.js', '../../dist/typeorm-adapter/es2015'],
        annotation: true,
        externalLibs: ['buffer'],
        bundles: [
            { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundles', outputFile: 'typeorm-adapter.umd.js', format: 'umd', uglify: true },
            { target: 'es2015', module: 'es2020', moduleName: ['fesm2015'], outputFile: 'typeorm-adapter.js', format: 'es', exportAs: 'node' },
            { target: 'es2020', module: 'es2020', moduleName: ['fesm2020', 'esm2020'], outputFile: 'typeorm-adapter.js', format: 'es', exportAs: 'default' }
        ]
    }
})
export class TypeormAdapterBuilder implements AfterInit {
    onAfterInit(): void | Promise<void> {
        console.log('typeorm adapter build has inited...')
    }
}
