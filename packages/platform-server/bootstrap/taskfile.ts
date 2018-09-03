import { PipeModule, Package } from '@taskfr/pipes';
import { TaskContainer } from '@taskfr/platform-server';


@Package({
    src: 'src',
    clean: 'lib',
    test: 'test/**/*.spec.ts',
    assets: {
        ts: { dest: 'lib', annotation: true, uglify: true }
    }
})
export class PfServerBootBuilder {
}

TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(PfServerBootBuilder);
