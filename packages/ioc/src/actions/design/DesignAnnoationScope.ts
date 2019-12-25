import { DesignDecoratorScope } from './DesignDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { DesignActionContext } from './DesignActionContext';
import { BindProviderAction } from './BindProviderAction';
import { DecoratorScopes, DesignRegisterer } from '../DecoratorsRegisterer';
import { Injectable } from '../../decorators/Injectable';
import { Singleton } from '../../decorators/Singleton';
import { Providers } from '../../decorators/Providers';
import { Refs } from '../../decorators/Refs';
import { IActionSetup, IActionInjector } from '../Action';
import { InjectableMetadata } from '../../metadatas/InjectableMetadata';
import { IocDesignAction } from './IocDesignAction';
import { InjectToken } from '../../InjectToken';
import { ParamProviders } from '../../providers/types';
import { IocSingletonManager } from '../IocSingletonManager';
import { RuntimeActionContext } from '../runtime/RuntimeActionContext';
import { RuntimeLifeScope } from '../RuntimeLifeScope';
import { CTX_TYPE_REGIN } from '../../context-tokens';

export class DesignAnnoationScope extends IocRegisterScope<DesignActionContext> implements IActionSetup {

    setup() {
        this.actInjector
            .regAction(BindProviderAction);

        this.actInjector.getInstance(DesignRegisterer)
            .register(Injectable, DecoratorScopes.Class, BindProviderAction)
            .register(Singleton, DecoratorScopes.Class, BindProviderAction)
            .register(Providers, DecoratorScopes.Class, BindProviderAction)
            .register(Refs, DecoratorScopes.Class, BindProviderAction);

        this.use(AnnoationRegInAction)
            .use(BeforeAnnoationDecoratorScope)
            .use(RegAnnoationAction)
            .use(DesignClassDecoratorScope);
    }
}

export class AnnoationRegInAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        let regIn: string;
        ctx.targetReflect.decorators.classDecors.some(d => {
            if (ctx.reflects.hasMetadata(d, ctx.type)) {
                let meta = ctx.reflects.getMetadata<InjectableMetadata>(d, ctx.type).find(m => m.regIn);
                if (meta) {
                    regIn = meta.regIn;
                }
            }
            return regIn;
        });
        if (regIn === 'root') {
            ctx.set(CTX_TYPE_REGIN, regIn);
            ctx.set(InjectToken, ctx.getContainer());
        }
        next();
    }
}

export class RegAnnoationAction extends IocDesignAction {

    constructor(private actInjector: IActionInjector) {
        super()
    }

    execute(ctx: DesignActionContext, next: () => void): void {
        let injector = ctx.injector;
        let provide = injector.getTokenKey(ctx.token);
        let type = ctx.type;
        let singleton = ctx.targetReflect.singleton;
        let actInjector = this.actInjector;
        let factory = (...providers: ParamProviders[]) => {
            let mgr = injector.getInstance(IocSingletonManager);
            if (mgr.has(provide)) {
                return mgr.get(provide);
            }
            let ctx = RuntimeActionContext.parse(injector, {
                token: provide,
                type: type,
                singleton: singleton,
                providers: providers
            });
            actInjector.get(RuntimeLifeScope).register(ctx);
            return ctx.target;
        };

        injector.set(type, factory);
        if (provide !== type) {
            injector.set(provide, factory, type);
        }

        ctx.targetReflect.getInjector = () => injector;

        next();
    }
}


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
