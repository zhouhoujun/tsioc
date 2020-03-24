import { DesignDecorScope } from './DesignDecoratorScope';
import { IocRegScope } from '../IocRegisterScope';
import { DesignContext } from './DesignActionContext';
import { BindAnnoPdrAction } from './BindProviderAction';
import { DesignRegisterer } from '../DecoratorsRegisterer';
import { Injectable } from '../../decorators/Injectable';
import { Singleton } from '../../decorators/Singleton';
import { Providers } from '../../decorators/Providers';
import { Refs } from '../../decorators/Refs';
import { IActionSetup } from '../Action';
import { InjectableMetadata } from '../../metadatas/InjectableMetadata';
import { ParamProviders } from '../../providers/types';
import { RuntimeContext } from '../runtime/RuntimeActionContext';
import { RuntimeLifeScope } from '../RuntimeLifeScope';
import { CTX_TYPE_REGIN } from '../../context-tokens';
import { INJECTOR } from '../../IInjector';
import { DecoratorScope } from '../../types';
import { cls, befAnn } from '../../utils/exps';


export class DesignClassScope extends IocRegScope<DesignContext> implements IActionSetup {

    setup() {
        this.actInjector.getInstance(DesignRegisterer)
            .register(Injectable, cls, BindAnnoPdrAction)
            .register(Singleton, cls, BindAnnoPdrAction)
            .register(Providers, cls, BindAnnoPdrAction)
            .register(Refs, cls, BindAnnoPdrAction);

        this.use(AnnoRegInAction)
            .use(BeforeAnnoDecorScope)
            .use(RegClassAction)
            .use(DesignClassDecorScope);
    }
}

export const AnnoRegInAction = function (ctx: DesignContext, next: () => void): void {
    let regIn: string;
    let reflects = ctx.reflects;
    ctx.targetReflect.decorators.classDecors.some(d => {
        if (reflects.hasMetadata(d, ctx.type)) {
            let meta = reflects.getMetadata<InjectableMetadata>(d, ctx.type).find(m => m.regIn);
            if (meta) {
                regIn = meta.regIn;
            }
        }
        return regIn;
    });
    if (regIn === 'root') {
        ctx.setValue(CTX_TYPE_REGIN, regIn);
        ctx.setValue(INJECTOR, ctx.getContainer());
    }
    next();
};


export const RegClassAction = function (ctx: DesignContext, next: () => void): void {
    let injector = ctx.injector;
    let provide = injector.getTokenKey(ctx.token);
    let type = ctx.type;
    let singleton = ctx.targetReflect.singleton;
    let actInjector = ctx.reflects.getActionInjector();
    let factory = (...providers: ParamProviders[]) => {
        let ctx = RuntimeContext.parse(injector, {
            token: provide,
            type: type,
            singleton: singleton,
            providers: providers
        });
        actInjector.getInstance(RuntimeLifeScope).register(ctx);
        return ctx.target;
    };

    if (provide && provide !== type) {
        injector.set(provide, factory, type);
    } else {
        injector.set(type, factory);
    }

    ctx.targetReflect.getInjector = () => injector;

    next();
};


export class BeforeAnnoDecorScope extends DesignDecorScope {
    protected getDecorScope(): DecoratorScope {
        return befAnn;
    }
}

export class DesignClassDecorScope extends DesignDecorScope {
    protected getDecorScope(): DecoratorScope {
        return cls;
    }
}
