import { Abstract, Injectable } from '@tsdi/ioc';

/**
 * ref element identfy selector.
 *
 * @export
 * @abstract
 * @class RefIdentfy
 */
@Abstract()
export abstract class RefSelector {
    /**
     * get ref selector id.
     *
     * @abstract
     * @param {*} refElement
     * @returns {string}
     * @memberof RefSelector
     */
    abstract getSelector(refElement: any): string;
}


@Injectable()
export class RefComponentSelector extends RefSelector {
    getSelector(refElement: any): string {
        return refElement ? refElement.selector : '';
    }
}
