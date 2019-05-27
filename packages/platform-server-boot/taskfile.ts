import { Workflow, Task } from '@tsdi/activities';
import { PackModule, LibPackBuilderOption } from '@tsdi/pack';
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';
import { AfterInit } from '@tsdi/boot';

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
            { target: 'es5', targetFolder: 'src', moduleName: 'main', moduleFolder: 'src', dtsMain: 'index.d.ts' },
            { target: 'es2015' },
            { target: 'es2017' }
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
