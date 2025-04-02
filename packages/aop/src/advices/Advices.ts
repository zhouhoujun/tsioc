import { composeHandlers, object2string, isNil, invokeTail, Class, ctorName } from '@tsdi/ioc';
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
    protected maps: Map<AdviceTypes, Advicer[]>;
    private _beforeHanlder?: ApplicationHandlerFn | null;
    private _afterHanlder?: ApplicationHandlerFn | null;
    private _pointcutHanlder?: ApplicationHandlerFn | null;
    private _afterThrowingHanlder?: ApplicationHandlerFn | null;
    private _afterReturninHanlder?: ApplicationHandlerFn | null;

    constructor() {
        this.maps = new Map();
    }


    protected cleanHanlder() {
        this._beforeHanlder = undefined;
        this._afterHanlder = undefined;
        this._pointcutHanlder = undefined;
        this._afterThrowingHanlder = undefined;
        this._afterReturninHanlder = undefined;
    }

    addAdvicer(type: AdviceTypes, advicer: Advicer) {
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
}

export class AdvicesMapping {
    private props: Map<string | symbol, Advices>;
    private child: Map<string | symbol, AdvicesMapping>;

    private _hasProp = false;
    get size() {
        return this.props.size
    }

    constructor(
        readonly typeRef: Class
    ) {
        this.props = new Map();
        this.child = new Map();
    }

    hasProp() {
        return this._hasProp || this.child.size > 0
    }


    get(name: string | symbol): Advices | undefined {
        return this.props.get(name);
    }

    set(name: string | symbol, advices: Advices) {
        if (!this._hasProp && name !== ctorName) this._hasProp = true;
        this.props.set(name, advices);
    }

    getChild(name: string | symbol): AdvicesMapping | undefined {
        return this.child.get(name);
    }

    setChild(name: string | symbol, advices: AdvicesMapping) {
        this.child.set(name, advices);
    }

    clear() {
        this.props.forEach(v => v.clear());
        this.child.forEach(c => c.clear());
        this.props.clear();
        this.child.clear();
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
