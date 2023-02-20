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
        outDir: '../../dist/platform-browser',
        src: 'src/**/*.ts',
        test: 'test/**/*.ts',
        clean: ['../../dist/platform-browser/src/**/*.js', '../../dist/platform-browser/es2015'],
        annotation: true,
        bundles: [
            { target: 'es5', targetFolder: 'src', dtsMain: 'index.d.ts' },
            { input: 'src/index.js', moduleName: 'main', moduleFolder: 'bundles', outputFile: 'platform-browser.umd.js', format: 'umd', uglify: true },
            { target: 'es2015', module: 'es2020', moduleName: ['fesm2015'], outputFile: 'platform-browser.js', format: 'es', exportAs: 'node' },
            { target: 'es2020', module: 'es2020', moduleName: ['fesm2020', 'esm2020'], outputFile: 'platform-browser.js', format: 'es', exportAs: 'default' }
        ]
    }
})
export class PfBrowserBuilder {
}

