import { ObjectMap, IocDecoratorRegisterer } from '@tsdi/ioc';
import { InjectorActionContext } from './InjectorActionContext';
import { InjectorScope } from './InjectorAction';
import { DecoratorInjectAction } from './DecoratorInjectAction';
import { ModuleDecoratorRegisterer } from '../services';

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
        next && next();
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
        }
        return ctx.decorState;
    }

    protected done(ctx: InjectorActionContext): boolean {
        return this.getState(ctx)[ctx.currDecoractor] = true;
    }
    protected isCompleted(ctx: InjectorActionContext): boolean {
        return ctx.types.length === 0 || !Object.values(this.getState(ctx)).some(inj => !inj);
    }
    protected getDecorators(ctx: InjectorActionContext): string[] {
        let states = this.getState(ctx);
        return Object.keys(states).reverse()
            .filter(dec => states[dec] === false);
    }

    setup() {
        this.use(DecoratorInjectAction);
    }
}
