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
            clean: '../../dist/cli'
        },
        <TsBuildOption>{
            activity: 'ts',
            src: 'src/**/*.ts',
            dist: '../../dist/cli/lib',
            test: 'test/**/*.spec.ts'
        },
        <AssetActivityOption>{
            activity: 'asset',
            src: ['package.json', '*.md'],
            dist: '../../dist/cli'
        }
    ]
})
export class CliBuilder {
}
