import { EMPTY_OBJ, InvokeArguments, ModuleDef, ModuleRef, ProvdierOf } from '@tsdi/ioc';
import { ApplicationArguments, ApplicationFactory, DefaultApplicationContext, PROCESS_ROOT } from '@tsdi/core';
import { ApplicationConfiguration, ConfigureManager } from '../configure/config';
import { BootApplicationContext, BootEnvironmentOption } from '../context';


export class BootApplicationContextImpl<T = any, TArg = ApplicationArguments> extends DefaultApplicationContext<T, TArg> implements BootApplicationContext<T, TArg> {

    
    constructor(readonly injector: ModuleRef, options: BootEnvironmentOption<TArg> = EMPTY_OBJ) {
        super(injector, options);

        const mgr = this.getConfigureManager();
        if (options.configures && options.configures.length) {
            options.configures.forEach(cfg => {
                mgr.useConfiguration(cfg)
            })
        } else {
            // load default config.
            mgr.useConfiguration()
        }
        
    }
    /**
     * configuration merge metadata config and all application config.
     */
    getConfiguration(): ApplicationConfiguration {
        return this.injector.get(ApplicationConfiguration)
    }

    /**
     * get configure manager.
     *
     * @returns {ConfigureManager}
     */
    getConfigureManager(): ConfigureManager {
        return this.injector.get(ConfigureManager)
    }
}


/**
 * default application factory.
 */
export class BootApplicationFactory extends ApplicationFactory {

    create<T, TArg = ApplicationArguments>(root: ModuleRef<T>, option?: BootEnvironmentOption): BootApplicationContext<T, TArg> {
        const ann = root.moduleReflect.getAnnotation<ModuleDef>();
        if (ann?.baseURL) {
            root.setValue(PROCESS_ROOT, ann.baseURL)
        }
        if (!option) {
            option = {};
        }
        if (!option.args) {
            option.args = ApplicationArguments as ProvdierOf<TArg>;
        }
        const ctx = this.createInstance(root, option);
        return ctx
    }


    protected createInstance(inj: ModuleRef, option?: InvokeArguments) {
        return new BootApplicationContextImpl(inj, option)
    }
}



