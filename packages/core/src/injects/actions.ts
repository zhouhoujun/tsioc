import { DesignRegisterer, CTX_CURR_DECOR, chain, IActionSetup, IocDecorRegisterer, ObjectMap, Type, isArray, isClass, lang, IocCompositeAction, DecoratorScope } from '@tsdi/ioc';
import { InjContext } from './context';
import { CTX_CURR_TYPE } from '../tk';

export abstract class InjScope extends IocCompositeAction<InjContext> {

}

/**
 * module inject action decorator register.
 *
 */
export class InjDecorRegisterer extends IocDecorRegisterer {

}

/**
 * module inject scope.
 */
export class InjModuleScope extends InjScope implements IActionSetup {

    setup() {
        this.use(InjDecorScope)
            .use(InjRegTypesScope);
    }
}


const inj: DecoratorScope = 'Inj';
const DECOR_STATE = 'CTX_DECOR_STATE';

/**
 * inject module by decorator.
 */
export class InjDecorScope extends InjScope implements IActionSetup {
    execute(ctx: InjContext, next?: () => void): void {
        if (!this.isCompleted(ctx)) {
            this.getDecorators(ctx)
                .some(dec => {
                    ctx.setValue(CTX_CURR_DECOR, dec);
                    super.execute(ctx);
                    this.done(ctx);
                    return this.isCompleted(ctx);
                });
        }
        if (ctx.types.length > 0) {
        next && next();
        }
    }

    getRegisterer(): IocDecorRegisterer {
        return this.actInjector.getInstance(DesignRegisterer).getRegisterer(inj);
    }

    protected getState(ctx: InjContext): ObjectMap<boolean> {
        if (!ctx.hasValue(DECOR_STATE)) {
            ctx.setValue(DECOR_STATE, this.getRegisterer()
                .getDecorators()
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {}));
        }
        return ctx.getValue(DECOR_STATE);
    }

    protected done(ctx: InjContext): boolean {
        return this.getState(ctx)[ctx.getValue(CTX_CURR_DECOR)] = true;
    }
    protected isCompleted(ctx: InjContext): boolean {
        return ctx.types.length === 0 || !Object.values(this.getState(ctx)).some(inj => !inj);
    }
    protected getDecorators(ctx: InjContext): string[] {
        let states = this.getState(ctx);
        return Object.keys(states).reverse()
            .filter(dec => states[dec] === false);
    }

    setup() {
        this.use(InjDecorAction);
    }
}

export const InjDecorAction = function (ctx: InjContext, next?: () => void): void {
    if (ctx.hasValue(CTX_CURR_DECOR)) {
        let actInj = ctx.reflects.getActionInjector()
        let decRgr = actInj.getInstance(DesignRegisterer).getRegisterer(inj);
        chain(decRgr.getFuncs(actInj, ctx.getValue(CTX_CURR_DECOR)), ctx, next);
    } else {
        next && next();
    }
};

/**
 * module inject register scope.
 */
export abstract class InjRegScope extends InjScope implements IActionSetup {

    execute(ctx: InjContext, next?: () => void): void {
        let types = this.getTypes(ctx);
        this.registerTypes(ctx, types);
        next && next();
    }

    protected abstract getTypes(ctx: InjContext): Type[];

    protected registerTypes(ctx: InjContext, types: Type[]) {
        if (isArray(types) && types.length) {
            let injector = ctx.injector;
            types.forEach(ty => {
                if (!injector.has(ty)) {
                    ctx.setValue(CTX_CURR_TYPE, ty);
                    super.execute(ctx);
                }
            });
            this.setNextRegTypes(ctx, types);
        }
    }

    protected setNextRegTypes(ctx: InjContext, registered: Type[]) {
        ctx.types = ctx.types.filter(ty => registered.indexOf(ty) < 0);
    }

    setup() {
        this.use(InjRegTypeAction);
    }
}

export class InjRegTypesScope extends InjRegScope {
    protected getTypes(ctx: InjContext): Type[] {
        return ctx.types;
    }
}


export const InjRegTypeAction = function (ctx: InjContext, next: () => void): void {
    let currType = ctx.getValue(CTX_CURR_TYPE);
    if (isClass(currType)) {
        ctx.injector.registerType(currType);
        ctx.registered.push(currType);
    }
    next();
};

/**
 * IocExt module injector
 */
export class InjIocExtScope extends InjRegScope {
    protected getTypes(ctx: InjContext): Type[] {
        return ctx.types.filter(ty => ctx.reflects.hasMetadata(ctx.getValue(CTX_CURR_DECOR), ty));
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
