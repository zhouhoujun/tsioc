import { IocDecoratorScope } from '../IocDecoratorScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { RuntimeDecoratorRegisterer } from '../../services';
import { DecoratorType } from '../../factories';
import { RuntimeDecoratorAction } from './RuntimeDecoratorAction';


/**
 * ioc register actions scope run before constructor.
 *
 * @export
 * @class IocBeforeConstructorScope
 * @extends {IocRuntimeScopeAction}
 */
export class IocBeforeConstructorScope extends  IocDecoratorScope {
    protected initDecoratorScope(ctx: RuntimeActionContext): void {
        if (!ctx.beforeCstrDecors) {
            ctx.beforeCstrDecors = Array.from(this.container.get(RuntimeDecoratorRegisterer).getDecoratorMap(DecoratorType.BeforeConstructor).keys())
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
    }
    protected filter(ctx: RuntimeActionContext, dec: string): boolean {
        return !ctx.beforeCstrDecors[dec];
    }
    protected done(ctx: RuntimeActionContext): boolean {
        return ctx.beforeCstrDecors[ctx.currDecoractor] = true;
    }
    protected isCompleted(ctx: RuntimeActionContext): boolean {
        return ctx.isPropertyCompleted();
    }
    protected getDecorators(ctx: RuntimeActionContext): string[] {
        let reg = this.container.get(RuntimeDecoratorRegisterer);
        let beforeCstrDecors = Object.keys(ctx.beforeCstrDecors);
        return Array.from(reg.getDecoratorMap(this.getDecorType()).keys())
            .filter(dec => beforeCstrDecors.indexOf(dec) >= 0);
    }
    protected getDecorType(): DecoratorType {
        return DecoratorType.BeforeConstructor;
    }
    setup() {
        this.use(RuntimeDecoratorAction);
    }
}
