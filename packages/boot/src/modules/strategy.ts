import { isNil, FacRecord, Strategy, Token, Injector } from '@tsdi/ioc';
import { ModuleInjector } from '../Context';




/**
 * module injector strategy.
 */
export class ModuleStrategy<TI extends Injector = Injector> implements Strategy {

    constructor(private getMDRef: (curr: TI) => ModuleInjector[]) {
    }



    has(injector: TI, token: Token): boolean {
        return this.getMDRef(injector).some(r => r.exports.has(token));
    }

    hasValue<T>(injector: TI, token: Token) {
        return this.getMDRef(injector).some(r => r.exports.hasValue(token));
    }

    resolve?<T>(injector: TI, token: Token<T>, provider: Injector): T {
        let inst: T;
        if (this.getMDRef(injector).some(e => {
            inst = e.exports.get(token, provider);
            return !isNil(inst);
        })) return inst;

        return injector.parent?.get(token, provider);
    }

    getProvider<T>(injector: TI, key: Token<T>) {
        let type;
        this.getMDRef(injector).some(r => {
            type = r.exports.getTokenProvider(key);
            return type;
        });
        return type;
    }

    iterator(injector: TI, callbackfn: (fac: FacRecord, key: Token, resolvor?: TI) => void | boolean) {
        return this.getMDRef(injector).some(e => e.exports.iterator(callbackfn) === false);
    }

}
