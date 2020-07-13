import { PackModule, LibPackBuilderOption, LibBundleOption } from '@tsdi/pack';
import { Workflow, Task } from '@tsdi/activities';
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';

@Task({
    deps: [
        PackModule,
        ServerActivitiesModule
    ],
    baseURL: __dirname,
    template: `<libs [outDir]="'../../dist/compiler'" [src]="'src/**/*.ts'" [test]="'test/**/*.ts'" [annotation]="true" [bundles]="bundles" ></libs>`
})
export class CompilerBuilder {
    bundles: LibBundleOption[];
    constructor() {
        this.bundles = [
            { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundle', outputFile: 'compiler.umd.js', format: 'umd', uglify: true },
            { input: 'src/index.js', moduleName: ['fesm5', 'esm5'], outputFile: 'compiler.js', format: 'cjs' },
            { target: 'es2017', input: 'es2017/index.js', moduleName: ['fesm2017', 'esm2017'], outputFile: 'compiler.js', format: 'cjs' }
        ]
    }
}

if (process.cwd() === __dirname) {
    Workflow.run(CompilerBuilder);
}
