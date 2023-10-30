import { PackModule, LibPackBuilderOption, LibPackBuilder } from '@tsdi/pack';
import { Workflow } from '@tsdi/activities';
import { ServerActivitiesModule } from '@tsdi/platform-server/activities';
import { Component } from '@tsdi/components';

// @Component({
//     // baseURL: __dirname,
//     // template: <LibPackBuilderOption>{
//     //     activity: 'libs',
//     //     outDir: '../../dist/component',
//     //     src: 'src/**/*.ts',
//     //     test: 'test/**/*.ts',
//     //     annotation: true,
//     //     bundles: [
//     //         { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
//     //         { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundle', outputFile: 'component.umd.js', format: 'umd', uglify: true },
//     //         { input: 'src/index.js', moduleName: ['fesm5', 'esm5'], outputFile: 'component.js', format: 'cjs' },
//     //         { target: 'es2017', input: 'es2017/index.js', moduleName: ['fesm2017', 'esm2017'], outputFile: 'component.js', format: 'cjs' }
//     //     ]
//     // }
//     template: `
//         <LibPackBuilder [src]="src" [test]="test" [outDir]="outDir">
//            <bundles>
//                 <bundle ></bundle>
//             <bundles>
//         </LibPackBuilder>
//     `
// })
// export class ComponentBuilder {
//     src = "src/**/*.ts";
//     test = 'test/**/*.ts';
//     outDir = '../../dist/component';
// }

if (process.cwd() === __dirname) {
    Workflow.run(LibPackBuilder, {
        baseURL: __dirname,
        deps: [PackModule, ServerActivitiesModule],
        payload: {
            src: 'src/**/*.ts',
            test: 'test/**/*.ts',
            outDir: '../../dist/component',
            bundles: [
                { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
                { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundle', outputFile: 'component.umd.js', format: 'umd', uglify: true },
                { input: 'src/index.js', moduleName: ['fesm5', 'esm5'], outputFile: 'component.js', format: 'cjs' },
                { target: 'es2017', input: 'es2017/index.js', moduleName: ['fesm2017', 'esm2017'], outputFile: 'component.js', format: 'cjs' }
            ]
        }
    });
}
