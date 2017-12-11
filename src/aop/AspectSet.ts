import { Singleton, Inject } from '../core';
import { IContainer } from '../IContainer';
import { symbols } from '../utils';
import { Token } from '../types';
import { Type } from '../Type';

/**
 * for global aspect mamager.
 *
 * @export
 * @class AspectSet
 */
export class AspectSet {
    private aspects: Map<Type<any>, Function>;
    constructor(private container: IContainer) {
        this.aspects = new Map<Type<any>, Function>();
    }

    add(aspect: Type<any>) {
        if (!this.aspects.has(aspect)) {
            this.aspects.set(aspect, () => {
                return this.container.get(aspect);
            });
        }
    }

    forEach(express: (type: Type<any>, instance) => void) {
        this.aspects.forEach((value, aspect) => {
            express(aspect, value());
        });
    }
}
