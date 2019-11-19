import { RegisterActionContext, RegisterActionOption } from '../RegisterActionContext';
import { IIocContainer, ContainerFactory } from '../../IIocContainer';
import { createRaiseContext } from '../Action';
import { Type } from '../../types';

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
export class DesignActionContext extends RegisterActionContext {

    /**
     * parse design action context.
     *
     * @static
     * @param {(Type | DesignActionOption)} target
     * @param { ContainerFactory } [raiseContainer]
     * @returns {DesignActionContext}
     * @memberof DesignActionContext
     */
    static parse(target: Type | DesignActionOption, raiseContainer?: ContainerFactory): DesignActionContext {
        return createRaiseContext(DesignActionContext, target, raiseContainer);
    }

}
