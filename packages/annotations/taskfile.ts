import { Workflow, Task } from '@tsdi/activities';
import { TsBuildOption, PackModule } from '@tsdi/pack';
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';

@Task({
    deps: [
        PackModule,
        ServerActivitiesModule
    ],
    baseURL: __dirname,
    template: <TsBuildOption>{
        activity: 'ts',
        clean: ['../../dist/annotations/lib'],
        src: 'src/**/*.ts',
        dist: '../../dist/annotations/lib',
        annotation: true,
        sourcemaps: './sourcemaps',
        jsValuePipe: true,
        uglify: true,
        tsconfig: './tsconfig.json'

    }
})
export class AnnotationsBuild {
}

if (process.cwd() === __dirname) {
    Workflow.run(AnnotationsBuild);
}
