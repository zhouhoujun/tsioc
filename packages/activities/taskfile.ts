import { PackModule, LibPackBuilderOption } from '@tsdi/pack';
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';
import { Component } from '@tsdi/components';
import { Application, Module } from '@tsdi/core';
import { ActivityModule } from './src/ActivityModule';
import { Workflow } from './src/Workflow';



// @Module({
//     imports: [
//         PackModule,
//         ServerActivitiesModule,
//         ActivityModule.withOptions({
//             template: [
//                 {
//                     activity: 'libs',
//                     outDir: '../../dist/activities',
//                     src: 'src/**/*.ts',
//                     test: 'test/**/*.ts',
//                     annotation: true,
//                     // sourcemap: true,
//                     bundles: [
//                         { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
//                         { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundles', outputFile: 'activities.umd.js', format: 'umd', uglify: true },
//                         { input: 'src/index.js', moduleName: ['fesm5', 'esm5'], outputFile: 'activities.js', format: 'cjs' },
//                         { target: 'es2017', input: 'es2017/index.js', moduleName: ['fesm2017', 'esm2017'], outputFile: 'activities.js', format: 'cjs' }
//                     ]
//                 }
//             ]
//         })
//     ],
//     baseURL: __dirname,
// })
// export class ActivitiesBuilder {
// }

if (process.cwd() === __dirname) {
    Workflow.run({
        imports:[PackModule, ServerActivitiesModule],
        template: [
            {
                activity: 'libs',
                outDir: '../../dist/activities',
                src: 'src/**/*.ts',
                test: 'test/**/*.ts',
                annotation: true,
                // sourcemap: true,
                bundles: [
                    { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
                    { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundles', outputFile: 'activities.umd.js', format: 'umd', uglify: true },
                    { input: 'src/index.js', moduleName: ['fesm5', 'esm5'], outputFile: 'activities.js', format: 'cjs' },
                    { target: 'es2017', input: 'es2017/index.js', moduleName: ['fesm2017', 'esm2017'], outputFile: 'activities.js', format: 'cjs' }
                ]
            }
        ]
    });
}
