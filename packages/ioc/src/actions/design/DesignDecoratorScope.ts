import { DesignDecorAction } from './DesignDecoratorAction';
import { DesignContext } from './DesignActionContext';
import { IocDecorScope } from '../IocDecoratorScope';
import { IActionSetup } from '../Action';
import { DecoratorScope } from '../../types';
import { befAnn, ann, aftAnn } from '../../utils/exps';

export abstract class DesignDecorScope extends IocDecorScope<DesignContext> implements IActionSetup {

    protected getScopeDecorators(ctx: DesignContext, scope: DecoratorScope): string[] {
        switch (scope) {
            case befAnn:
                return ctx.targetReflect.decorators.design.beforeAnnoDecors
            case ann:
            case aftAnn:
            case 'Class':
                return ctx.targetReflect.decorators.design.classDecors;
            case 'Method':
                return ctx.targetReflect.decorators.design.methodDecors;
            case 'Property':
                return ctx.targetReflect.decorators.design.propsDecors;
        }
        return ctx.targetReflect.decorators.design.getDecortors(scope);
    }

    setup() {
        this.use(DesignDecorAction);
    }

}
