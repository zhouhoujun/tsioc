import { Singleton, Inject } from '../core/index';
import { IContainer } from '../IContainer';
import { symbols, MapSet } from '../utils/index';
import { Token } from '../types';
import { Type } from '../Type';
import { Advices } from './Advices';


/**
 * for global aspect mamager.
 *
 * @export
 * @class AspectSet
 */
@Singleton
export class AspectSet {
    private aspects: MapSet<Type<any>, Function>;
    private advicesMap: MapSet<string, Advices>;
    constructor(private container: IContainer) {
        this.aspects = new MapSet<Type<any>, Function>();
        this.advicesMap = new MapSet<string, Advices>();
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
