import { IContainer } from '../IContainer';
import { isContainer } from '../Container';
import { Type, isFunction, isBaseObject } from '@tsdi/ioc';

/**
 * handle option.
 *
 * @export
 * @interface HandleOption
 */
export interface HandleOption {
    /**
     * raise container getter.
     *
     * @memberof HandleOption
     */
    raiseContainerGetter?: () => IContainer;
}

/**
 * handle context.
 *
 * @export
 * @class HandleContext
 */
export class HandleContext {

    private raiseContainerGetter: () => IContainer;

    hasRaiseContainer(): boolean {
        return isFunction(this.raiseContainerGetter);
    }
    /**
     * raise container accessor.
     *
     * @memberof ResovleContext
     */
    getRaiseContainer(): IContainer {
        if (this.raiseContainerGetter) {
            return this.raiseContainerGetter();
        } else {
            throw new Error('has not setting raise container.')
        }
    }

    /**
     * set resolve context.
     *
     * @param {() => IContainer} raiseContainer
     * @memberof IocActionContext
     */
    setRaiseContainer(raiseContainer: IContainer | (() => IContainer)) {
        if (isFunction(raiseContainer)) {
            this.raiseContainerGetter = raiseContainer;
        } else if (isContainer(raiseContainer)) {
            this.raiseContainerGetter = () => raiseContainer;
        }
    }

    /**
     * module type class.
     *
     * @type {Type<any>}
     * @memberof HandleContext
     */
    type: Type<any>;


    constructor() {

    }

    /**
     * set option.
     *
     * @param {HandleOption} options
     * @memberof BootContext
     */
    setOptions(options: HandleOption) {
        if (isBaseObject(options)) {
            Object.assign(this, options);
        }
    }
}
