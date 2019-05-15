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
            { src: 'src/**/*.ts', clean: ['../../dist/boot/lib'], dist: '../../dist/boot/lib', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/boot/bundle'], outputFile: '../../dist/boot/fesm5/boot.umd.js', format: 'umd', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/boot/fesm5'], outputFile: '../../dist/boot/fesm5/boot.js', format: 'cjs', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/boot/fesm2015'], outputFile: '../../dist/boot/fesm2015/boot.js', format: 'cjs', tsconfig: './tsconfig.es2015.json' }
        ]
    }
})
export class BootBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(BootBuilder);
}
