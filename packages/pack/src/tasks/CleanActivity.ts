import { Input, Expression, Src, Task, Activity } from '@tsdi/activities';
import { Inject } from '@tsdi/ioc';

/**
 * Source activity.
 *
 * @export
 * @class SourceActivity
 * @extends {TransformActivity}
 */
@Task('clean, [clean]')
export class SourceActivity extends Activity<void> {

    @Input()
    protected clean: Expression<Src>;


    constructor(
        @Inject('[src]') src: Expression<Src>,
        @Inject(ContainerToken) container: IContainer) {
        super(container)
        this.src = src;
    }

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let strSrc = await this.resolveExpression(this.src, ctx);
        if (strSrc) {
            let options = await this.resolveExpression(this.options, ctx);
            this.result.value = src(ctx.toRootSrc(strSrc), options || undefined);
        }
    }
}
