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
        tasks: [
            { src: 'src/**/*.ts', moduleName: ['main', 'esm5'], moduleFolder: 'lib', dtsMain: 'index.d.ts', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', moduleName: 'fesm5', fileName: 'platform-server-boot.js', format: 'cjs', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', moduleName: 'fesm2015', fileName: 'platform-server-boot.js', format: 'cjs', annotation: true, tsconfig: './tsconfig.es2015.json' },
            { input: 'src/index.ts', moduleName: 'fesm2017', fileName: 'platform-server-boot.js', format: 'cjs', annotation: true, tsconfig: './tsconfig.es2017.json' }
        ]
    }
})
export class PfServerBootBuilder implements AfterInit {
    onAfterInit(): void | Promise<void> {
        console.log('pack build has inited...')
    }
}

if (process.cwd() === __dirname) {
    Workflow.run(PfServerBootBuilder);
}
