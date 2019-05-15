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
            { src: 'src/**/*.ts', test: 'test/**/*.ts', clean: ['../../dist/platform-browser-boot/lib'], dist: '../../dist/platform-browser-boot/lib', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/platform-browser-boot/bundle'], outputFile: '../../dist/platform-browser-boot/bundle/platform-browser-boot.umd.js', format: 'umd', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/platform-browser-boot/fesm5'], outputFile: '../../dist/platform-browser-boot/fesm5/platform-browser-boot.js', format: 'cjs', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/platform-browser-boot/fesm2015'], outputFile: '../../dist/platform-browser-boot/fesm2015/platform-browser-boot.js', format: 'cjs', tsconfig: './tsconfig.es2015.json' }
        ]
    }
})
export class PfBrowerBootBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(PfBrowerBootBuilder);
}
