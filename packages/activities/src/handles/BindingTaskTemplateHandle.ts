import { Handle, BuildContext } from '@tsdi/boot';
import { Activity } from '../core';
import { isArray } from '@tsdi/ioc';
import { SequenceActivity, ParallelActivity } from '../activities';

export class BindingTaskTemplateHandle extends Handle<BuildContext> {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (ctx.component) {
            if (isArray(ctx.component)) {
                if (ctx.target instanceof SequenceActivity || ctx.target instanceof ParallelActivity) {
                    ctx.target.add(...ctx.component);
                    ctx.component = null;
                } else {
                    let sequence = this.container.get(SequenceActivity);
                    sequence.add(...ctx.component);
                    ctx.component = sequence;
                }
            }

            let currScope = ctx.scope;
            let annoation = ctx.annoation;
            let target = ctx.target;

            if (currScope) {
                target.$parent = () => currScope;
            }
            target.$annoation = () => annoation;

            if (ctx.component instanceof Activity) {
                ctx.component.scope = target;
                ctx.component.isScope = true;
                let scope = target;
                let scopes = [];
                while (scope) {
                    scopes.push(scope);
                    scope = scope.$parent ? scope.$parent() : null;
                }
                ctx.component.scopes = scopes;
                // console.log(scopes);
            } else {
                ctx.component.$parent = () => target;
            }
        }
        await next();
    }
}
