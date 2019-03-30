import { PackModule, Pack, PackActivity } from '@tsdi/pack';
import { Workflow } from '@tsdi/activities';

@Pack({
    baseURL: __dirname,
    src: 'src',
    clean: 'lib',
    test: 'test/**/*.spec.ts',
    assets: {
        ts: { dest: 'lib', annotation: true, uglify: false }
    }
})
export class AnnoBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.create()
        .use(PackModule)
        .bootstrap(AnnoBuilder);
}
