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
        test: 'test/**/*.ts',
        annotation: true,
        externalLibs: [ 'buffer'],
        bundles: [
            { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { input: 'src/index.js', moduleName: ['fesm5', 'main', 'esm5'], outputFile: 'typeorm-adapter.js', format: 'cjs' },
            { target: 'es2017', input: 'es2017/index.js', moduleName: ['fesm2017', 'esm2017'], outputFile: 'typeorm-adapter.js', format: 'cjs' }
        ]
    }
})
export class TypeormAdapterBuilder implements AfterInit {
    onAfterInit(): void | Promise<void> {
        console.log('typeorm adapter build has inited...')
    }
}
