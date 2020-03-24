import { DecoratorScope } from '../../types';
import { IocDecorScope } from '../IocDecoratorScope';
import { RuntimeDecorAction } from './RuntimeDecoratorAction';
import { RuntimeContext } from './RuntimeActionContext';
import { cls, mth, ptr, parm, befCstr, aftCstr } from '../../utils/exps';



export abstract class RuntimeDecorScope extends IocDecorScope<RuntimeContext> {

    protected getScopeDecorators(ctx: RuntimeContext, scope: DecoratorScope): string[] {
        switch (scope) {
            case cls:
                return ctx.targetReflect.decorators.runtime.classDecors;
            case mth:
                return ctx.targetReflect.decorators.runtime.methodDecors;
            case ptr:
                return ctx.targetReflect.decorators.runtime.propsDecors;
            case parm:
                return ctx.targetReflect.decorators.runtime.getParamDecors(ctx.propertyKey, ctx.target);
            case befCstr:
                return ctx.targetReflect.decorators.runtime.beforeCstrDecors;
            case aftCstr:
                return ctx.targetReflect.decorators.runtime.afterCstrDecors
        }
        return ctx.targetReflect.decorators.runtime.getDecortors(scope);
    }

    setup() {
        this.use(RuntimeDecorAction);
    }

}
