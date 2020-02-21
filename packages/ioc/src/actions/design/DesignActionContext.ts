import { IInjector } from '../../IInjector';
import { createRaiseContext } from '../IocActionContext';
import { RegisterActionContext, RegisterActionOption } from '../RegisterActionContext';


/**
 * design action option.
 *
 * @export
 * @interface DesignActionOption
 * @extends {RegisterActionOption}
 */
export interface DesignActionOption extends RegisterActionOption {

}

/**
 * design action context.
 *
 * @export
 * @class DesignActionContext
 * @extends {RegisterActionContext}
 */
export class DesignActionContext extends RegisterActionContext<DesignActionOption> {

    /**
     * parse design action context.
     *
     * @static
     *
     * @param { IInjector } injecor
     * @param {DesignActionOption} options
     * @returns {DesignActionContext}
     * @memberof DesignActionContext
     */
    static parse(injecor: IInjector, options: DesignActionOption): DesignActionContext {
        return createRaiseContext(injecor, DesignActionContext, options);
    }

}
