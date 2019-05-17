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
            { src: 'src/**/*.ts', test: 'test/**/*.ts', clean: '../../dist/aop/lib', dist: '../../dist/aop/lib', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/aop/bundle', outputFile: '../../dist/aop/bundle/aop.umd.js', format: 'umd', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/aop/fesm5', outputFile: '../../dist/aop/fesm5/aop.js', format: 'cjs', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/aop/fesm2015', outputFile: '../../dist/aop/fesm2015/aop.js', format: 'cjs', annotation: true, tsconfig: './tsconfig.es2015.json' },
            { input: 'src/index.ts', clean: '../../dist/aop/fesm2017', outputFile: '../../dist/aop/fesm2017/aop.js', format: 'cjs', annotation: true, tsconfig: './tsconfig.es2017.json' }
        ]
    }
})
export class AopBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(AopBuilder);
}
