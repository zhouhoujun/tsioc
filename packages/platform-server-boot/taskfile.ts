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
        outDir: '../../dist/platform-server-boot',
        src: 'src/**/*.ts',
        test: 'test/**/*.ts',
        annotation: true,
        bundles: [
            { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { input: 'src/index.js', moduleName: ['fesm5', 'main', 'esm5'], outputFile: 'platform-server-boot.js', format: 'cjs' },
            { target: 'es2015', module:'es2020', input: 'es2015/index.js', moduleName: ['fesm2015', 'esm2015'], outputFile: 'platform-server-boot.js', format: 'es' }
        ]
    }
})
export class PfServerBootBuilder implements AfterInit {
    onAfterInit(): void | Promise<void> {
    }
}

if (process.cwd() === __dirname) {
    Workflow.run(PfServerBootBuilder);
}
