import { Workflow, Task } from '@tsdi/activities';
import { TsBuildOption, PackModule, AssetActivityOption } from '@tsdi/pack';
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';

@Task({
    deps: [
        PackModule,
        ServerActivitiesModule
    ],
    baseURL: __dirname,
    template: [
        {
            activity: 'clean',
            clean: ['../../dist/annotations']
        },
        <TsBuildOption>{
            activity: 'ts',
            src: 'src/**/*.ts',
            dist: '../../dist/annotations/lib',
            dts: '../../dist/annotations/lib',
            sourcemap: true,
            uglify: true
        },
        <AssetActivityOption>{
            activity: 'asset',
            src: ['package.json', '*.md'],
            dist: '../../dist/annotations'
        }
    ]
})
export class AnnotationsBuild {
}

if (process.cwd() === __dirname) {
    Workflow.run(AnnotationsBuild);
}
