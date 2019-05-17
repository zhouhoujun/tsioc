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
            { src: 'src/**/*.ts', test: 'test/**/*.ts', clean: '../../dist/boot/lib', dist: '../../dist/boot/lib', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/boot/bundle', outputFile: '../../dist/boot/bundle/boot.umd.js', format: 'umd', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/boot/fesm5', outputFile: '../../dist/boot/fesm5/boot.js', format: 'cjs', uglify: true, annotation: true, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: '../../dist/boot/fesm2015', outputFile: '../../dist/boot/fesm2015/boot.js', format: 'cjs', annotation: true, tsconfig: './tsconfig.es2015.json' },
            { input: 'src/index.ts', clean: '../../dist/boot/fesm2017', outputFile: '../../dist/boot/fesm2017/boot.js', format: 'cjs', annotation: true, tsconfig: './tsconfig.es2017.json' }
        ]
    }
})
export class BootBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(BootBuilder);
}
