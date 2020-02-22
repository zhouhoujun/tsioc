import { DesignDecoratorScope } from './DesignDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { DesignActionContext } from './DesignActionContext';
import { BindProviderAction } from './BindProviderAction';
import { DecoratorScopes, DesignRegisterer } from '../DecoratorsRegisterer';
import { Injectable } from '../../decorators/Injectable';
import { Singleton } from '../../decorators/Singleton';
import { Providers } from '../../decorators/Providers';
import { Refs } from '../../decorators/Refs';
import { IActionSetup } from '../Action';
import { InjectableMetadata } from '../../metadatas/InjectableMetadata';
import { ParamProviders } from '../../providers/types';
import { RuntimeActionContext } from '../runtime/RuntimeActionContext';
import { RuntimeLifeScope } from '../RuntimeLifeScope';
import { CTX_TYPE_REGIN } from '../../context-tokens';
import { INJECTOR } from '../../IInjector';

export class DesignClassScope extends IocRegisterScope<DesignActionContext> implements IActionSetup {

    setup() {
        this.actInjector.getInstance(DesignRegisterer)
            .register(Injectable, DecoratorScopes.Class, BindProviderAction)
            .register(Singleton, DecoratorScopes.Class, BindProviderAction)
            .register(Providers, DecoratorScopes.Class, BindProviderAction)
            .register(Refs, DecoratorScopes.Class, BindProviderAction);

        this.use(AnnoationRegInAction)
            .use(BeforeAnnoationDecoratorScope)
            .use(RegClassAction)
            .use(DesignClassDecoratorScope);
    }
}

export const AnnoationRegInAction = function (ctx: DesignActionContext, next: () => void): void {
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


export const RegClassAction = function (ctx: DesignActionContext, next: () => void): void {
    let injector = ctx.injector;
    let provide = injector.getTokenKey(ctx.token);
    let type = ctx.type;
    let singleton = ctx.targetReflect.singleton;
    let actInjector = ctx.reflects.getActionInjector();
    let factory = (...providers: ParamProviders[]) => {
        let ctx = RuntimeActionContext.parse(injector, {
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


export class BeforeAnnoationDecoratorScope extends DesignDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.BeforeAnnoation;
    }
}

export class DesignClassDecoratorScope extends DesignDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Class;
    }
}
