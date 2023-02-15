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
        annotation: true,
        externalLibs: [ 'buffer'],
        bundles: [
            { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundle', outputFile: 'typeorm-adapter.umd.js', format: 'umd', uglify: true },
            { target: 'es2015', input: 'es2015/index.js', moduleName: ['fesm2015', 'esm2015'], outputFile: 'typeorm-adapter.js', format: 'cjs' }
        ]
    }
})
export class TypeormAdapterBuilder implements AfterInit {
    onAfterInit(): void | Promise<void> {
        console.log('typeorm adapter build has inited...')
    }
}
