import { PipeModule, Package, TsConfigure } from '@taskfr/pipes';
import { TaskContainer } from '@taskfr/platform-server';

@Package({
    src: 'src',
    clean: 'lib',
    test: 'test/**/*.spec.ts',
    assets: {
        ts: <TsConfigure>{ dest: 'lib', annotation: true, uglify: false }
    }
})
export class Builder {
}

TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(Builder);
