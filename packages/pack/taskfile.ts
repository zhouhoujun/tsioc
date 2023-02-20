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
        outDir: '../../dist/pack',
        src: 'src/**/*.ts',
        // test: 'test/**/*.ts',
        clean: ['../../dist/pack/src/**/*.js', '../../dist/pack/es2015'],
        annotation: true,
        sourcemap: true,
        replaces: [
            [`import * as globby from 'globby';`, `import  globby from 'globby';`]
        ],
        bundles: [
            { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundles', outputFile: 'pack.js', format: 'cjs', uglify: true },
            { target: 'es2015', module: 'es2020', moduleName: ['fesm2015'], outputFile: 'pack.js', format: 'es', exportAs: 'node' },
            { target: 'es2020', module: 'es2020', moduleName: ['fesm2020', 'esm2020'], outputFile: 'pack.js', format: 'es', exportAs: 'default' }
        ]
    }
})
export class PackBuilder implements AfterInit {
    onAfterInit(): void | Promise<void> {
        console.log('pack build has inited...')
    }
}
