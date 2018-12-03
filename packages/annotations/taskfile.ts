import { PackModule, Pack, PackActivity } from '@taskfr/pack';
import { TaskContainer } from '@taskfr/core';

@Pack({
    src: 'src',
    clean: 'lib',
    test: 'test/**/*.spec.ts',
    assets: {
        ts: { dest: 'lib', annotation: true, uglify: false }
    }
})
export class Builder extends PackActivity {
}

TaskContainer.create(__dirname)
    .use(PackModule)
    .bootstrap(Builder);
