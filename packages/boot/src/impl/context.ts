import { InvokeArguments } from '@tsdi/ioc';
import { ApplicationFactory, DefaultApplicationContext, ModuleRef, PROCESS_ROOT } from '@tsdi/core';
import { ApplicationConfiguration, ConfigureManager } from '../configure/config';
import { BootApplicationContext, BootEnvironmentOption } from '../context';


export class BootApplicationContextImpl extends DefaultApplicationContext implements BootApplicationContext {

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

    create<T>(root: ModuleRef<T>, option?: BootEnvironmentOption): BootApplicationContext {
        if (root.moduleReflect.annotation?.baseURL) {
            root.setValue(PROCESS_ROOT, root.moduleReflect.annotation.baseURL)
        }
        const ctx = this.createInstance(root, option);
        return ctx
    }

    initOption(ctx: BootApplicationContext, option?: BootEnvironmentOption) {
        if (!option) return;

        const mgr = ctx.getConfigureManager();
        if (option.configures && option.configures.length) {
            option.configures.forEach(cfg => {
                mgr.useConfiguration(cfg)
            })
        } else {
            // load default config.
            mgr.useConfiguration()
        }
    }

    protected createInstance(inj: ModuleRef, option?: InvokeArguments) {
        return new BootApplicationContextImpl(inj, option)
    }
}



