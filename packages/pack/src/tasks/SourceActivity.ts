import { NodeActivityContext, ITransform } from '../core';
import { Activity, Task, Src, Expression, Input } from '@tsdi/activities';
import { Inject } from '@tsdi/ioc';
import { ContainerToken, IContainer } from '@tsdi/core';
import { SrcOptions, src } from 'vinyl-fs';

/**
 * Source activity.
 *
 * @export
 * @class SourceActivity
 * @extends {TransformActivity}
 */
@Task('src, [src]')
export class SourceActivity extends Activity<ITransform> {

    @Input()
    protected src: Expression<Src>;

    @Input()
    protected options: Expression<SrcOptions>;

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
