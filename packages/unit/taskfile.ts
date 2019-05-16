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
            { src: 'src/**/*.ts', test: 'test/**/*.ts', clean: '../../dist/unit/lib', dist: '../../dist/unit/lib', uglify: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/unit/bundle', outputFile: '../../dist/unit/bundle/unit.umd.js', format: 'umd', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/unit/fesm5', outputFile: '../../dist/unit/fesm5/unit.js', format: 'cjs', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/unit/fesm2015', outputFile: '../../dist/unit/fesm2015/unit.js', format: 'cjs', tsconfig: './tsconfig.es2015.json' }
        ]
    }
})
export class UnitBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(UnitBuilder);
}
