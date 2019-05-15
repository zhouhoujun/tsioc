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
            { src: 'src/**/*.ts', clean: ['../../dist/unit-console/lib'], dist: '../../dist/unit-console/lib', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/unit-console/fesm5'], outputFile: '../../dist/unit-console/fesm5/unit-console.js', format: 'cjs', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/unit-console/fesm2015'], outputFile: '../../dist/unit-console/fesm2015/unit-console.js', format: 'cjs', tsconfig: './tsconfig.es2015.json' }
        ]
    }
})
export class UnitConsoleBuilder implements AfterInit {
    onAfterInit(): void | Promise<void> {
        console.log('pack build has inited...')
    }
}

if (process.cwd() === __dirname) {
    Workflow.run(UnitConsoleBuilder);
}
