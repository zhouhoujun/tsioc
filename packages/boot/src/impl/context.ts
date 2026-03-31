import { InvokeOptions, ModuleDef, ModuleRef, ProvdierOf } from '@tsdi/ioc';
import { ApplicationArguments, ApplicationContextFactory, DefaultApplicationContext } from '@tsdi/core';
import { ApplicationConfiguration, ConfigureManager } from '../configure/config';
import { BootApplicationContext, BootEnvironmentOption } from '../context';


export class BootApplicationContextImpl<T = any> extends DefaultApplicationContext<T> implements BootApplicationContext<T> {

    
    constructor(readonly injector: ModuleRef<T>, options: BootEnvironmentOption = {}) {
        super(injector, options);

        const mgr = this.getConfigureManager();
        if (options.configures && options.configures.length) {
            options.configures.forEach(cfg => {
                mgr.useConfiguration(cfg)
            })
        } else {
            mgr.useConfiguration()
        }
        
    }
    
    getConfiguration(): ApplicationConfiguration {
        return this.injector.get(ApplicationConfiguration)
    }

    getConfigureManager(): ConfigureManager {
        return this.injector.get(ConfigureManager)
    }
}


export class BootApplicationFactory extends ApplicationContextFactory {

    create<T = any>(root: ModuleRef<T>, option?: BootEnvironmentOption): BootApplicationContext<T> {
        const ann = root.moduleReflect.getAnnotation<ModuleDef>();
        const appArgs = root.get(ApplicationArguments, null);
        
        if (ann?.baseURL && appArgs) {
            appArgs.mergeEnvironment({ baseURL: ann.baseURL });
        }
        
        if (!option) {
            option = {};
        }
        if (!option.payload) {
            option.payload = ApplicationArguments as ProvdierOf<T>;
        }
        const ctx = this.createInstance(root, option);
        return ctx
    }


    protected createInstance(inj: ModuleRef, option?: InvokeOptions) {
        return new BootApplicationContextImpl(inj, option)
    }
}



