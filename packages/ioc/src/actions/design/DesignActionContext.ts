import { createRaiseContext } from '../Action';
import { RegisterActionContext, RegisterActionOption } from '../RegisterActionContext';
import { ContainerFactory } from '../../IIocContainer';

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
     * @param {DesignActionOption} options
     * @param { ContainerFactory } [raiseContainer]
     * @returns {DesignActionContext}
     * @memberof DesignActionContext
     */
    static parse(options: DesignActionOption, containerFactory: ContainerFactory): DesignActionContext {
        return createRaiseContext(DesignActionContext, options, containerFactory);
    }

}
