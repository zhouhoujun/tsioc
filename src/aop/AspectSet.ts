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
@Singleton
export class AspectSet {
    @Inject(symbols.IContainer)
    private container: IContainer;
    private aspects: Set<Type<any>>;
    constructor() {
        this.aspects = new Set();
    }

    add(aspect: Type<any>) {
        if (!this.aspects.has(aspect)) {
            this.aspects.add(aspect);
        }
    }

    forEach(express: (type: Type<any>, instance) => void) {
        this.aspects.forEach(aspect => {
            express(aspect, this.container.get(aspect));
        });
    }
}
