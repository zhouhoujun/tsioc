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
        tasks: [
            { src: 'src/**/*.ts', clean: ['../../dist/platform-server-logs/lib'], dist: '../../dist/platform-server-logs/lib', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/platform-server-logs/fesm5'], outputFile: '../../dist/platform-server-logs/fesm5/platform-server-logs.js', format: 'cjs', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/platform-server-logs/fesm2015'], outputFile: '../../dist/platform-server-logs/fesm2015/platform-server-logs.js', format: 'cjs', tsconfig: './tsconfig.es2015.json' }
        ]
    }
})
export class PfServerLogsBuilder implements AfterInit {
    onAfterInit(): void | Promise<void> {
        console.log('pack build has inited...')
    }
}

if (process.cwd() === __dirname) {
    Workflow.run(PfServerLogsBuilder);
}
