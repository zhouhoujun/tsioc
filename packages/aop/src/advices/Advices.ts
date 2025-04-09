import { composeHandlers, object2string, isNil, invokeTail, Class, ctorName, Type } from '@tsdi/ioc';
import { ApplicationHandlerFn } from '@tsdi/core';
import { Advicer } from './Advicer';
import { AdviceTypes, AroundMetadata } from '../metadata/meta';
import { JoinPoint } from '../joinpoints/JoinPoint';

/**
 * advices of target.
 *
 * @export
 * @interface Advices
 */
export class Advices {
    private _hasGet = false;
    private _hasSet = false;
    protected maps: Map<AdviceTypes, Advicer[]>;
    private _beforeHanlder?: ApplicationHandlerFn | null;
    private _afterHanlder?: ApplicationHandlerFn | null;
    private _pointcutHanlder?: ApplicationHandlerFn | null;
    private _afterThrowingHanlder?: ApplicationHandlerFn | null;
    private _afterReturninHanlder?: ApplicationHandlerFn | null;

    constructor(readonly proptType?: Type) {
        this.maps = new Map();
    }

    hasGet() {
        return this._hasGet
    }

    hasSet() {
        return this._hasSet
    }

    protected cleanHanlder() {
        this._beforeHanlder = undefined;
        this._afterHanlder = undefined;
        this._pointcutHanlder = undefined;
        this._afterThrowingHanlder = undefined;
        this._afterReturninHanlder = undefined;
    }

    addAdvicer(type: AdviceTypes, advicer: Advicer) {
        if (!this._hasGet) {
            if (advicer.accessor) {
                this._hasGet = advicer.accessor === 'get' || advicer.accessor === 'value';
            } else {
                this._hasGet = true;
            }
        }

        if (!this._hasSet) {
            if (advicer.accessor) {
                this._hasSet = advicer.accessor === 'set' || advicer.accessor === 'value';
            } else {
                this._hasSet = true;
            }
        }


        let advicers = this.maps.get(type);
        if (!advicers) {
            advicers = [advicer];
            this.maps.set(type, advicers);
            this.cleanHanlder()
        } else {
            if (!advicers.some(a => equals(a, advicer))) {
                advicers.push(advicer);
                this.cleanHanlder()
            }
        }
    }

    getBeforeHanlder(): ApplicationHandlerFn | null {
        if (this._beforeHanlder === undefined) {
            const advices = [...this.maps.get('Around') ?? [], ...this.maps.get('Before') ?? []];
            this._beforeHanlder = advices?.length ? toHanlder(advices) : null;
        }
        return this._beforeHanlder;
    }

    getPointcutHanlder(): ApplicationHandlerFn | null {
        if (this._pointcutHanlder === undefined) {
            const advices = this.maps.get('Pointcut');
            this._pointcutHanlder = advices?.length ? toHanlder(advices) : null;
        }
        return this._pointcutHanlder;
    }

    getAfterHanlder(): ApplicationHandlerFn | null {
        if (this._afterHanlder === undefined) {
            const advices = [...this.maps.get('Around') ?? [], ...this.maps.get('After') ?? []];
            this._afterHanlder = advices?.length ? toHanlder(advices) : null;
        }
        return this._afterHanlder;
    }
    getAfterThrowingHanlder(): ApplicationHandlerFn | null {
        if (this._afterThrowingHanlder === undefined) {
            const advices = [...this.maps.get('Around') ?? [], ...this.maps.get('AfterThrowing') ?? []];
            this._afterThrowingHanlder = advices?.length ? toHanlder(advices) : null;
        }
        return this._afterThrowingHanlder;
    }
    getAfterReturningHanlder(): ApplicationHandlerFn | null {
        if (this._afterReturninHanlder === undefined) {
            const advices = [...this.maps.get('Around') ?? [], ...this.maps.get('AfterReturning') ?? []];
            this._afterReturninHanlder = advices?.length ? toHanlder(advices) : null;
        }
        return this._afterReturninHanlder;
    }

    clear() {
        this.cleanHanlder();
        this.maps.clear();
    }

    /**
     * 合并另一个Advices实例
     */
    merge(other: Advices): this {
        other.maps.forEach((advicers, type) => {
            advicers.forEach(advicer => this.addAdvicer(type, advicer));
        });
        return this;
    }

    /**
     * 克隆当前Advices实例
     */
    clone(): Advices {
        const cloned = new Advices();
        cloned.merge(this);
        return cloned;
    }
}

export class AdvicesMapping {
    private props: Map<string | symbol, Advices | AdvicesMapping>;

    private _hasProp = false;
    get size() {
        return this.props.size
    }

    constructor(
        readonly typeRef: Class,
        private match: (fullName: string, startsWith?: boolean) => boolean
    ) {
        this.props = new Map();
    }

    hasProp() {
        return this._hasProp;
    }


    get(name: string | symbol): Advices | AdvicesMapping | undefined {
        return this.props.get(name);
    }

    has(name: string | symbol): boolean {
        return this.props.has(name);
    }

    set(name: string | symbol, advices: Advices | AdvicesMapping) {
        if (!this._hasProp && name !== ctorName) this._hasProp = true;
        this.props.set(name, advices);
    }

    clear() {
        this.props.forEach(v => v.clear());
        this.props.clear();
    }


    /**
     * 合并另一个AdvicesMapping实例
     */
    merge(other: AdvicesMapping): this {
        // 合并属性
        other.props.forEach((advices, name) => {
            const existing = this.props.get(name);
            if (existing) {
                if (advices instanceof AdvicesMapping && existing instanceof AdvicesMapping) {
                    existing.merge(existing.clone());
                } else if (advices instanceof Advices && existing instanceof Advices) {
                    existing.merge(existing.clone());
                }
            } else {
                this.props.set(name, advices.clone());
            }
        });

        return this;
    }

    /**
     * 克隆当前AdvicesMapping实例
     */
    clone(): AdvicesMapping {
        const cloned = new AdvicesMapping(this.typeRef, this.match);
        cloned.merge(this);
        return cloned;
    }

    /**
     * 深度遍历所有Advices
     */
    forEach(callback: (advices: Advices, name: string | symbol) => void): void {
        this.props.forEach((v, k) => {
            if (v instanceof AdvicesMapping) {
                v.forEach(callback);
            } else {
                callback(v, k);
            }
        });
    }

    /**
     * 查找指定名称的Advices（包括子节点）
     */
    find(fullName: string): Advices | AdvicesMapping | undefined {
        if(this.match(fullName)){
            return this.props.get(fullName.substring(fullName.lastIndexOf('.')+1));          
        }
        return undefined;
    }

}


function toHanlder(advices: Advicer[]): ApplicationHandlerFn<JoinPoint> {
    return composeHandlers(advices.map(a => (input: JoinPoint, context?: any) => invokeAdvice(input, a)));
}
function equals(a: Advicer, b: Advicer) {
    return a.aspect.type === b.aspect.type && a.advice.name === b.advice.name
}

const aExp = /^@/;

function invokeAdvice(joinPoint: JoinPoint, advicer: Advicer) {
    if (joinPoint.destroyed) {
        throw new Error(`joinPoint is destroyed, when invoked advicer ${object2string(advicer)}.\n\njoinPoint object ${object2string(joinPoint, { fun: false, typeInst: true })}`)
    }
    if (advicer.accessor && advicer.accessor !== 'value' && advicer.accessor !== joinPoint.accessor) {
        return;
    }
    const metadata = advicer.advice as AroundMetadata;
    if (!isNil(joinPoint.args) && metadata.args) {
        joinPoint.setValue(metadata.args, joinPoint.args)
    }

    if (metadata.annotationArgName) {
        if (metadata.annotationName) {
            let d: string = metadata.annotationName;
            d = d ? (aExp.test(d) ? d : `@${d}`) : '';
            joinPoint.setValue(metadata.annotationArgName, joinPoint.annotations ? joinPoint.annotations.filter(v => v && v.decor.toString() == d).map(d => d.metadata) : [])
        } else {
            joinPoint.setValue(metadata.annotationArgName, joinPoint.annotations?.map(d => d.metadata) ?? [])
        }
    }

    if (!isNil(joinPoint.returning) && metadata.returning) {
        joinPoint.setValue(metadata.returning, joinPoint.returning)
    }

    if (joinPoint.throwing && metadata.throwing) {
        joinPoint.setValue(metadata.throwing, joinPoint.throwing)
    }

    const context = advicer.aspect.getContext();
    if (context) {
        joinPoint.addRef(context)
    }

    return invokeTail(() => advicer.aspect.invoke(advicer.advice.name!, joinPoint), {
        finally: () => {
            context && joinPoint.removeRef(context);
        }
    });
}

