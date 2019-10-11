import {
    IocGetCacheAction, RuntimeMethodScope, RuntimeActionContext,
    CreateInstanceAction, ConstructorArgsAction,
    IocBeforeConstructorScope, IocAfterConstructorScope,
    RuntimeAnnoationScope, RuntimePropertyScope, RuntimeParamScope,
    InstanceCheckAction, RuntimeDecoratorAction, GetSingletionAction
} from './runtime';
import { RuntimeDecoratorRegisterer } from './DecoratorRegisterer';
import { RegisterLifeScope } from './RegisterLifeScope';
import { InitReflectAction } from './InitReflectAction';

/**
 * runtime life scope.
 *
 * @export
 * @class RuntimeLifeScope
 * @extends {LifeScope}
 */
export class RuntimeLifeScope extends RegisterLifeScope<RuntimeActionContext> {

    execute(ctx: RuntimeActionContext, next?: () => void): void {
        let raiseContainer = ctx.getRaiseContainer();
        if (raiseContainer === this.container) {
            super.execute(ctx, next);
        }
    }

    setup() {
        this.container.registerSingleton(RuntimeDecoratorRegisterer, () => new RuntimeDecoratorRegisterer(this.container));
        this.registerAction(InstanceCheckAction)
            .registerAction(RuntimeDecoratorAction)
            .registerAction(RuntimeParamScope, true);

        this.use(InitReflectAction)
            .use(GetSingletionAction)
            .use(IocGetCacheAction)
            .use(ConstructorArgsAction)
            .use(IocBeforeConstructorScope, true)
            .use(CreateInstanceAction)
            .use(IocAfterConstructorScope, true)
            .use(RuntimePropertyScope, true)
            .use(RuntimeMethodScope, true)
            .use(RuntimeAnnoationScope, true);

    }

}
