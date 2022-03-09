import { Type } from '@tsdi/ioc';
import { Application, ApplicationContext, ApplicationOption, BootstrapOption } from '@tsdi/core';



/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication extends Application {

    protected override initRoot() {
        super.initRoot();
        this.root.setValue(BootApplication, this);
    }

    /**
    * run application.
    *
    * @static
    * @param {ApplicationOption<M>)} target
    * @returns {Promise<ApplicationContext<M>>}
    */
    static override run(target: ApplicationOption): Promise<ApplicationContext>
    /**
     * run application.
     *
     * @static
     * @param {Type<T>} target
     * @param {BootstrapOption)} [option]  application run depdences.
     * @returns {Promise<IBootContext>}
     */
    static override run(target: Type, option?: BootstrapOption): Promise<ApplicationContext>;
    static override run(target: any, option?: BootstrapOption): Promise<ApplicationContext> {
        return new BootApplication(option ? { type: target, ...option } as ApplicationOption : target).run();
    }
}


