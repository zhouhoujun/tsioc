import { PipeModule, Package, ShellTaskConfig, IPipeContext } from '@taskfr/pipes';
import { TaskContainer } from '@taskfr/platform-server';

@Package({
    src: 'src',
    clean: 'lib',
    test: 'test/**/*.spec.ts',
    assets: {
        ts: { dest: 'lib', annotation: true, uglify: true }
    },
    sequence: [
        <ShellTaskConfig>{
            shell: (ctx: IPipeContext) => {
                // let envArgs = ctx.getEnvArgs();
                return `cd bootstrap & tkf`
            },
            activity: 'shell'
        }
    ]
})
export class PfServerBuilder {
}

TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(PfServerBuilder);


