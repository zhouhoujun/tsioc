import { DesignRegisterer, chain, IActionSetup, IocDecorRegisterer, ObjectMap, Type, isArray, isClass, lang, IocActions, DecoratorScope, refl } from '@tsdi/ioc';
import { InjContext } from './context';

export abstract class InjScope extends IocActions<InjContext> {

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

/**
 * inject module by decorator.
 */
export class InjDecorScope extends InjScope implements IActionSetup {
    execute(ctx: InjContext, next?: () => void): void {
        if (!this.isCompleted(ctx)) {
            this.getDecorators(ctx)
                .some(dec => {
                    ctx.currDecor = dec;
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
        if (!ctx.state) {
            ctx.state = this.getRegisterer()
                .getDecorators()
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return ctx.state;
    }

    protected done(ctx: InjContext): boolean {
        return this.getState(ctx)[ctx.currDecor] = true;
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
    if (ctx.currDecor) {
        let actInj = ctx.injector.getContainer().getActionInjector()
        let decRgr = actInj.getInstance(DesignRegisterer).getRegisterer(inj);
        chain(decRgr.getFuncs(actInj, ctx.currDecor), ctx, next);
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
                    ctx.currType = ty;
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
    let currType = ctx.currType;
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
        return ctx.types.filter(ty => refl.getIfy(ty).decors.some(d => d.decor === ctx.currDecor && d.type === 'class'));
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
