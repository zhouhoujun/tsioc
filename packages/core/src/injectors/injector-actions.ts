import { DesignRegisterer, CTX_CURR_DECOR, chain, IActionSetup, IocDecorRegisterer, ObjectMap, Type, isArray, isClass, lang, IocCompositeAction } from '@tsdi/ioc';
import { InjectorContext } from './InjectorContext';
import { CTX_CURR_TYPE } from '../context-tokens';

export abstract class InjectorScope extends IocCompositeAction<InjectorContext> {

}

/**
 * register decorator module inject action.
 *
 * @export
 * @class ModuleDecoratorRegisterer
 * @extends {IocDecorRegisterer}
 */
export class InjectorDecorRegisterer extends IocDecorRegisterer {

}


export class ModuleInjectorScope extends InjectorScope implements IActionSetup {

    setup() {
        this.use(InjDecorScope)
            .use(InjTypesRegScope);
    }
}



const DECOR_STATE = 'CTX_DECOR_STATE';

export class InjDecorScope extends InjectorScope implements IActionSetup {
    execute(ctx: InjectorContext, next?: () => void): void {
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
        return this.actInjector.getInstance(DesignRegisterer).getRegisterer('Inject');
    }

    protected getState(ctx: InjectorContext): ObjectMap<boolean> {
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

    protected done(ctx: InjectorContext): boolean {
        return this.getState(ctx)[ctx.getValue(CTX_CURR_DECOR)] = true;
    }
    protected isCompleted(ctx: InjectorContext): boolean {
        return ctx.types.length === 0 || !Object.values(this.getState(ctx)).some(inj => !inj);
    }
    protected getDecorators(ctx: InjectorContext): string[] {
        let states = this.getState(ctx);
        return Object.keys(states).reverse()
            .filter(dec => states[dec] === false);
    }

    setup() {
        this.use(InjDecorAction);
    }
}

export const InjDecorAction = function (ctx: InjectorContext, next?: () => void): void {
    if (ctx.hasValue(CTX_CURR_DECOR)) {
        let actInj = ctx.reflects.getActionInjector()
        let decRgr = actInj.getInstance(DesignRegisterer).getRegisterer('Inject');
        chain(decRgr.getFuncs(actInj, ctx.getValue(CTX_CURR_DECOR)), ctx, next);
    } else {
        next && next();
    }
};


export abstract class InjectorRegScope extends InjectorScope implements IActionSetup {

    execute(ctx: InjectorContext, next?: () => void): void {
        let types = this.getTypes(ctx);
        this.registerTypes(ctx, types);
        next && next();
    }

    protected abstract getTypes(ctx: InjectorContext): Type[];

    protected registerTypes(ctx: InjectorContext, types: Type[]) {
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

    protected setNextRegTypes(ctx: InjectorContext, registered: Type[]) {
        ctx.types = ctx.types.filter(ty => registered.indexOf(ty) < 0);
    }

    setup() {
        this.use(InjRegTypeAction);
    }
}

export class InjTypesRegScope extends InjectorRegScope {
    protected getTypes(ctx: InjectorContext): Type[] {
        return ctx.types;
    }
}


export const InjRegTypeAction = function (ctx: InjectorContext, next: () => void): void {
    let currType = ctx.getValue(CTX_CURR_TYPE);
    if (isClass(currType)) {
        ctx.injector.registerType(currType);
        ctx.registered.push(currType);
    }
    next();
};

export class InjIocExtScope extends InjectorRegScope {
    protected getTypes(ctx: InjectorContext): Type[] {
        return ctx.types.filter(ty => ctx.reflects.hasMetadata(ctx.getValue(CTX_CURR_DECOR), ty));
    }

    protected setNextRegTypes(ctx: InjectorContext, registered: Type[]) {
        ctx.types = [];
    }
};

export const ModuleToTypesAction = function (ctx: InjectorContext, next: () => void): void {
    if (!ctx.types) {
        ctx.types = lang.getTypes(ctx.module);
    }
    ctx.registered = ctx.registered || [];
    next();
};
