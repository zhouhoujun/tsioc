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
        annotation: true,
        bundles: [
            { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { input: 'src/index.js', moduleName: ['fesm5', 'main', 'esm5'], outputFile: 'platform-server-logs.js', format: 'cjs' },
            { target: 'es2015', module:'es2020', input: 'es2015/index.js', moduleName: ['fesm2015', 'esm2015'], outputFile: 'platform-server-logs.js', format: 'es' }
        ]
    }
})
export class PfServerLogsBuilder implements AfterInit {
    onAfterInit(): void | Promise<void> {
        console.log('pf build has inited...')
    }
}

if (process.cwd() === __dirname) {
    Workflow.run(PfServerLogsBuilder);
}
