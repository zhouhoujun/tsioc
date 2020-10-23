import { IActionSetup, Type, isArray, isClass, lang, IocActions, refl, IocAction } from '@tsdi/ioc';
import { InjContext } from './context';

export abstract class InjScope extends IocActions<InjContext> {

}

/**
 * module inject scope.
 */
export class InjModuleScope extends InjScope implements IActionSetup {

    setup() {
        this.use(InjIocExtScope)
            .use(InjRegDefaultAction);
    }
}

/**
 * module inject register scope.
 */
export abstract class InjAction extends IocAction<InjContext> {

    execute(ctx: InjContext, next?: () => void): void {
        let types = this.getTypes(ctx);
        this.registerTypes(ctx, types);
        if (next && ctx.types.length) {
            next();
        }
    }

    protected abstract getTypes(ctx: InjContext): Type[];

    protected registerTypes(ctx: InjContext, types: Type[]) {
        if (isArray(types) && types.length) {
            let injector = ctx.injector;
            types.forEach(ty => {
                injector.registerType(ty);
                ctx.registered.push(ty);
            });
            this.setNextRegTypes(ctx, types);
        }
    }

    protected setNextRegTypes(ctx: InjContext, registered: Type[]) {
        ctx.types = ctx.types.filter(ty => registered.indexOf(ty) < 0);
    }
}

export const InjRegDefaultAction = function (ctx: InjContext, next: () => void): void {
    let injector = ctx.injector;
    ctx.types?.forEach(ty => {
        injector.registerType(ty);
        ctx.registered.push(ty);
    });
};

/**
 * IocExt module injector
 */
export class InjIocExtScope extends InjAction {
    protected getTypes(ctx: InjContext): Type[] {
        return ctx.types.filter(ty => refl.get(ty)?.iocExt);
    }

    protected setNextRegTypes(ctx: InjContext, registered: Type[]) {
        ctx.types = [];
    }
};

export const InjModuleToTypesAction = function (ctx: InjContext, next: () => void): void {
    if (!ctx.types) {
        ctx.types = lang.getTypes(ctx.module);
    }
    ctx.registered = ctx.registered || [];
    next();
};
