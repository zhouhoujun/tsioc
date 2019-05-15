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
            { src: 'src/**/*.ts', clean: ['../../dist/platform-serve/lib'], dist: '../../dist/platform-serve/lib', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/platform-serve/fesm5'], outputFile: '../../dist/platform-serve/fesm5/platform-serve.js', format: 'cjs', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/platform-serve/fesm2015'], outputFile: '../../dist/platform-serve/fesm2015/platform-serve.js', format: 'cjs', tsconfig: './tsconfig.es2015.json' }
        ]
    }
})
export class PfServerBuilder implements AfterInit {
    onAfterInit(): void | Promise<void> {
        console.log('pack build has inited...')
    }
}

if (process.cwd() === __dirname) {
    Workflow.run(PfServerBuilder);
}
