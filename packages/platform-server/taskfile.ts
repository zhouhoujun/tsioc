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
        annotation: true,
        externalLibs: [
            'globby'
        ],
        bundles: [
            { target: 'es5', targetFolder: 'src', moduleName: 'main', moduleFolder: 'src', dtsMain: 'index.d.ts' },
            { target: 'es2015', module: 'es2020', input: 'es2015/index.js', moduleName: ['fesm2015', 'esm2015'], outputFile: 'platform-server.js', format: 'es' }
        ]
    }
})
export class PfServerBuilder implements AfterInit {
    onAfterInit(): void | Promise<void> {
        console.log('pf build has inited...')
    }
}

if (process.cwd() === __dirname) {
    Workflow.run(PfServerBuilder);
}
