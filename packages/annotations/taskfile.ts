import { PackModule, Pack, PackActivity } from '@taskfr/pack';
import { Workflow } from '@taskfr/core';

@Pack({
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
