import { isNil, FnRecord, Strategy, Token, Injector } from '@tsdi/ioc';
import { ModuleInjector } from '../module';




/**
 * module injector strategy.
 */
export class ModuleStrategy<TI extends Injector = ModuleInjector> implements Strategy {

    constructor(private getMDRef: (curr: TI) => ModuleInjector[]) {
    }

    has(injector: TI, token: Token, deep?: boolean): boolean {
        return this.getMDRef(injector).some(r => r.exports.has(token)) || (deep && injector.parent ? injector.parent.has(token, deep) : false);
    }

    hasValue<T>(injector: TI, token: Token, deep?: boolean) {
        return this.getMDRef(injector).some(r => r.exports.hasValue(token, deep)) || (deep && injector.parent ? injector.parent.hasValue(token, deep) : false);
    }

    resolve?<T>(injector: TI, token: Token<T>, provider?: Injector): T {
        let inst: T = null!;
        if (this.getMDRef(injector).some(e => {
            inst = e.exports.get(token, provider);
            return !isNil(inst);
        })) return inst;

        return injector.parent?.get(token, provider)!;
    }

    getProvider<T>(injector: TI, key: Token<T>) {
        let type;
        this.getMDRef(injector).some(r => {
            type = r.exports.getTokenProvider(key);
            return type;
        });
        return type ?? injector.parent?.getTokenProvider(key)!;
    }

    iterator(injector: TI, callbackfn: (fac: FnRecord, key: Token, resolvor?: Injector) => void | boolean, deep?: boolean) {
        if (this.getMDRef(injector).some(e => e.exports.iterator(callbackfn) === false)) return false;
        return deep && injector.parent?.iterator(callbackfn, deep)
    }

}
