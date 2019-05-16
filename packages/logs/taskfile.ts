import { PackModule, LibPackBuilderOption } from '@tsdi/pack';
import { Workflow, Task } from '@tsdi/activities';
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';

@Task({
    deps: [
        ServerActivitiesModule,
        PackModule
    ],
    baseURL: __dirname,
    template: <LibPackBuilderOption>{
        activity: 'libs',
        tasks: [
            { src: 'src/**/*.ts', test: 'test/**/*.ts', clean: ['../../dist/logs/lib'], dist: '../../dist/logs/lib', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/logs/bundle'], outputFile: '../../dist/logs/bundle/logs.umd.js', format: 'umd', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/logs/fesm5'], outputFile: '../../dist/logs/fesm5/logs.js', format: 'cjs', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/logs/fesm2015'], outputFile: '../../dist/logs/fesm2015/logs.js', format: 'cjs', tsconfig: './tsconfig.es2015.json' }
        ]
    }
})
export class LogsBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(LogsBuilder);
}
