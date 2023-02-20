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
        outDir: '../../dist/platform-server',
        src: 'src/**/*.ts',
        test: 'test/**/*.ts',
        clean: ['../../dist/platform-server/es2015'],
        annotation: true,
        replaces: [
            [`import * as globby from 'globby';`, `import  globby from 'globby';`]
        ],
        bundles: [
            { target: 'es5', moduleName: 'main', moduleFolder: 'src', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { target: 'es2015', module: 'es2020', moduleName: ['fesm2015'], outputFile: 'platform-server.js', format: 'es', exportAs: 'node' },
            { target: 'es2020', module: 'es2020', moduleName: ['fesm2020', 'esm2020'], outputFile: 'platform-server.js', format: 'es', exportAs: 'default' }
        ]
    }
})
export class PfServerBuilder implements AfterInit {
    onAfterInit(): void | Promise<void> {
        console.log('pf build has inited...')
    }
}

