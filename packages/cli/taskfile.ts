import { Workflow, Task } from '@tsdi/activities';
import { TsBuildOption, PackModule } from '@tsdi/pack';

@Task({
    deps: [
        PackModule
    ],
    baseURL: __dirname,
    template: <TsBuildOption>{
        activity: 'ts',
        src: 'src/**/*.ts',
        clean: 'lib',
        test: 'test/**/*.spec.ts',
    }
})
export class CliBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(CliBuilder);
}
