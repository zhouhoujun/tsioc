import { PackModule, LibPackBuilderOption } from '@tsdi/pack';
import { Workflow, Task } from '@tsdi/activities';
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';

@Task({
    deps: [
        PackModule,
        ServerActivitiesModule
    ],
    baseURL: __dirname,
    template: <LibPackBuilderOption>{
        activity: 'libs',
        tasks: [
            { src: 'src/**/*.ts', clean: ['../../dist/ioc/lib'], dist: '../../dist/ioc/lib', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/ioc/bundle'], outputFile: '../../dist/ioc/bundle/ioc.umd.js', format: 'umd', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/ioc/fesm5'], outputFile: '../../dist/ioc/fesm5/ioc.js', format: 'cjs', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/ioc/fesm2015'], outputFile: '../../dist/ioc/fesm2015/ioc.js', format: 'cjs', tsconfig: './tsconfig.es2015.json' }
        ]
    }
})
export class CoreBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(CoreBuilder);
}
