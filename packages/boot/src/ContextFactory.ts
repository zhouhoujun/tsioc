import { ICoreInjector } from '@tsdi/core';
import { Abstract, Injectable } from '@tsdi/ioc';
import { BootContext, BootOption, BuildContext, BuildOption } from './Context';


/**
 * context factory.
 */
@Abstract()
export abstract class BuildContextFactory {

    constructor() {

    }

    /**
     * create context via option.
     * @param option
     * @param injector
     */
    abstract create(option: BuildOption, injector: ICoreInjector): BuildContext;
}


@Abstract()
export abstract class BootContextFactory {
    constructor() {

    }

    /**
     * create context via option.
     * @param option
     * @param injector
     */
    abstract create(option: BootOption, injector: ICoreInjector): BootContext;
}


@Injectable()
export class DefaultBuildContextFactory extends BuildContextFactory {
    create(option: BuildOption, injector: ICoreInjector): BuildContext {
        const opt = { ...option };
        return {
            getOptions: () => {
                return opt;
            }
        }
    }
}


@Injectable()
export class DefaultBootContextFactory extends BootContextFactory {
    create(option: BootOption, injector: ICoreInjector): BootContext {

    }

}
