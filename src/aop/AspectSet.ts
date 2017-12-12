import { Singleton, Inject } from '../core';
import { IContainer } from '../IContainer';
import { symbols } from '../utils';
import { Token } from '../types';
import { Type } from '../Type';
import { Advices } from './Advices';


/**
 * for global aspect mamager.
 *
 * @export
 * @class AspectSet
 */
export class AspectSet {
    private aspects: Map<Type<any>, Function>;
    private advicesMap: Map<string, Advices>;
    constructor(private container: IContainer) {
        this.aspects = new Map<Type<any>, Function>();
        this.advicesMap = new Map();
    }

    setAdvices(key: string, advices: Advices) {
        if (!this.advicesMap.has(key)) {
            this.advicesMap.set(key, advices);
        }
    }

    getAdvices(key: string) {
        if (!this.advicesMap.has(key)) {
            return null;
        }
        return this.advicesMap.get(key);
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
