import { RegOption, RegContext } from './RegContext';
import { IInjector } from '../IInjector';
import { createContext } from './IocActionContext';

/**
 * design action option.
 *
 * @extends {RegOption}
 */
export interface DesignOption extends RegOption {

}

/**
 * design action context.
 */
export class DesignContext extends RegContext<DesignOption> {

    /**
     * parse design action context.
     *
     * @static
     *
     * @param { IInjector } injecor
     * @param {DesignOption} options
     * @returns {DesignContext}
     * @memberof DesignActionContext
     */
    static parse(injecor: IInjector, options: DesignOption): DesignContext {
        return createContext(injecor, DesignContext, options);
    }

}
