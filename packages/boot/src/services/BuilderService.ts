import { Inject, Singleton, isFunction, ClassType, Type, IInjector, isPlainObject, lang, ROOT_INJECTOR } from '@tsdi/ioc';
import { BootOption, IBootContext } from '../Context';
import { IBootApplication } from '../IBootApplication';
import { BootLifeScope, RunnableBuildLifeScope, StartupServiceScope } from '../boot/lifescope';
import { IBuilderService } from './IBuilderService';
import { BUILDER, CTX_OPTIONS } from '../tk';
import { BootContext } from '../boot/ctx';
import { IBuildHandle } from '../boot/handles';



/**
 * service run runnable module.
 *
 * @export
 * @class BuilderService
 */
@Singleton(BUILDER)
export class BuilderService implements IBuilderService {

    static ρNPT = true;

    @Inject(ROOT_INJECTOR)
    protected root: IInjector;


    async statrup<T>(target: ClassType<T> | BootOption<T>): Promise<any> {
        let md: Type;
        let injector: IInjector;
        let options: BootOption<T>;
        if (isPlainObject<BootOption>(target)) {
            md = target.type;
            injector = target.injector;
            options = { bootstrap: md, ...target };
        } else {
            md = target as Type;
            options = { bootstrap: md };
        }
        if (!injector) {
            const state = this.root.state();
            injector = state.isRegistered(md) ? state.getInjector(md) || this.root : this.root;
        }
        const ctx = injector.getService({ token: BootContext, target: md, defaultToken: BootContext }, { provide: CTX_OPTIONS, useValue: options });
        await this.root.action().getInstance(StartupServiceScope).execute(ctx);
        return ctx.getStartup();
    }

    /**
     * run module.
     *
     * @template T
     * @template Topt
     * @param {(ClassType | Topt | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     */
    async run<T extends IBootContext = IBootContext, Topt extends BootOption = BootOption>(target: ClassType | Topt | T, ...args: string[]): Promise<T> {
        const ctx = this.createContext(target, args);
        await this.root.action().getInstance(RunnableBuildLifeScope).execute(ctx);
        return ctx as T;
    }

    boot(root: IBootContext) {
        return this.root.action().getInstance(BootLifeScope).execute(root);
    }

    createContext<T extends IBootContext, Topt extends BootOption>(target: any, args: string[]): T {
        let ctx: T;
        if (isModuleContext(target)) {
            ctx = target as T;
        } else {
            let md: Type;
            let injector: IInjector;
            let options: BootOption;
            if (isPlainObject<Topt>(target)) {
                md = target.type;
                injector = target.injector;
                options = { ...target, args };
            } else {
                md = target as Type;
                options = { type: md, args };
            }
            if (!injector) {
                const state = this.root.state();
                injector = state.isRegistered(md) ? state.getInjector(md) || this.root : this.root;
            }
            ctx = injector.getService<T>({ token: BootContext, target: md, defaultToken: BootContext }, { provide: CTX_OPTIONS, useValue: options });
        }
        return ctx;
    }
}

function isModuleContext(target: any): target is IBootContext {
    return (<IBootContext>target).reflect?.annoType === 'module';
}