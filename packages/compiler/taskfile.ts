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
            { target: 'es2015', module:'es2020', input: 'es2015/index.js', moduleName: ['fesm2015', 'esm2015'], outputFile: 'compiler.js', format: 'es' }
        ]
    }
}
