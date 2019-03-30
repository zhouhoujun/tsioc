import { InjectorActionContext } from './InjectorActionContext';
import { ObjectMap, IocDecoratorRegisterer } from '@tsdi/ioc';
import { ModuleDecoratorRegisterer } from './ModuleDecoratorRegisterer';
import { InjectorScope } from './InjectorAction';

export class DecoratorInjectorScope extends InjectorScope {
    execute(ctx: InjectorActionContext, next?: () => void): void {
        if (!this.isCompleted(ctx)) {
            this.getDecorators(ctx)
                .some(dec => {
                    ctx.currDecoractor = dec;
                    super.execute(ctx);
                    this.done(ctx);
                    return this.isCompleted(ctx);
                });
        }
        console.log('register default', this.isCompleted(ctx), this.getState(ctx));
        if (!this.isCompleted(ctx)) {
            next && next();
        }
    }

    getRegisterer(): IocDecoratorRegisterer {
        return this.container.get(ModuleDecoratorRegisterer);
    }

    protected getState(ctx: InjectorActionContext): ObjectMap<boolean> {
        if (!ctx.decorState) {
            ctx.decorState = this.container.get(ModuleDecoratorRegisterer)
                .getDecorators()
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
            console.log(ctx.decorState);
        }
        return ctx.decorState;
    }

    protected done(ctx: InjectorActionContext): boolean {
        return this.getState(ctx)[ctx.currDecoractor] = true;
    }
    protected isCompleted(ctx: InjectorActionContext): boolean {
        return ctx.injected || !Object.values(this.getState(ctx)).some(inj => !inj);
    }
    protected getDecorators(ctx: InjectorActionContext): string[] {
        let states = this.getState(ctx);
        return Object.keys(states)
            .filter(dec => states[dec] === false);
    }

    setup() {
    }
}
