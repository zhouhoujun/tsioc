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
            { src: 'src/**/*.ts', test: 'test/**/*.ts', clean: '../../dist/platform-browser-boot/lib', dist: '../../dist/platform-browser-boot/lib', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/platform-browser-boot/bundle', outputFile: '../../dist/platform-browser-boot/bundle/platform-browser-boot.umd.js', format: 'umd', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/platform-browser-boot/fesm5', outputFile: '../../dist/platform-browser-boot/fesm5/platform-browser-boot.js', format: 'cjs', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/platform-browser-boot/fesm2015', outputFile: '../../dist/platform-browser-boot/fesm2015/platform-browser-boot.js', format: 'cjs', annotation: true, tsconfig: './tsconfig.es2015.json' },
            { input: 'src/index.ts', clean: '../../dist/platform-browser-boot/fesm2017', outputFile: '../../dist/platform-browser-boot/fesm2017/platform-browser-boot.js', format: 'cjs', annotation: true, tsconfig: './tsconfig.es2017.json' }
        ]
    }
})
export class PfBrowerBootBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(PfBrowerBootBuilder);
}
