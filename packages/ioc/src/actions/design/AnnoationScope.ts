import { DesignDecorScope } from './DesignDecoratorScope';
import { IocRegScope } from '../IocRegisterScope';
import { DesignContext } from './DesignActionContext';
import { IocAutorunAction } from './IocAutorunAction';
import { DesignRegisterer } from '../DecoratorsRegisterer';
import { Autorun } from '../../decorators/AutoRun';
import { IocExt } from '../../decorators/IocExt';
import { IActionSetup } from '../Action';
import { aftAnn, ann } from '../../utils/exps';
import { DecoratorScope } from '../../types';



export class AnnoScope extends IocRegScope<DesignContext> implements IActionSetup {

    setup() {
        this.actInjector.getInstance(DesignRegisterer)
            .register(Autorun, aftAnn, IocAutorunAction)
            .register(IocExt, aftAnn, IocAutorunAction);

        this.use(AnnoDecorScope)
            .use(AfterAnnoDecorScope);
    }
}


export class AnnoDecorScope extends DesignDecorScope {
    protected getDecorScope(): DecoratorScope {
        return ann;
    }
}

export class AfterAnnoDecorScope extends DesignDecorScope {
    protected getDecorScope(): DecoratorScope {
        return aftAnn;
    }
}
