/* eslint-disable no-useless-escape */
import { isString, isRegExp, isArray, ctorName, Decors, Runtime, ClassRef, DecoratorType, InjectFlags } from '@tsdi/ioc';
import { AdviceMatcher } from '../AdviceMatcher';
import { AdviceMetadata } from '../metadata/meta';
import { AopDef } from '../metadata/ref';
import { MatchExpress, MatchOptions } from '../Advicer';

/**
 * advice matcher, use to match advice when a registered create instance.
 * implements {@link IAdviceMatcher}.
 * @export
 * @class AdviceMatcher
 * @implements {IAdviceMatcher}
 */
export class DefaultAdviceMatcher implements AdviceMatcher {

    constructor(private runtime: Runtime) { }


    parse(aspectMeta: AdviceMetadata): MatchExpress {
        if (aspectMeta.matchFn == undefined) {
            aspectMeta.matchFn = aspectMeta.pointcut ? this.matchTypeFactory(aspectMeta) : null;
        }
        
        const without = aspectMeta.without;
        const within = aspectMeta.within;
        const annotation = aspectMeta.annotation;
        const accessor = aspectMeta.accessor;
        const matchFn = aspectMeta.matchFn;
        const isSelf = aspectMeta.type;
        
        return (name, fullName, targetRef, target, options?: MatchOptions) => {
            if (without) {
                const outs = isArray(without) ? without : [without];
                for (let i = 0, len = outs.length; i < len; i++) {
                    const t = outs[i];
                    if ((target && target instanceof t) || targetRef.isExtends(t)) {
                        return false;
                    }
                }
            }
            if (within) {
                const ins = isArray(within) ? within : [within];
                let found = false;
                for (let i = 0, len = ins.length; i < len; i++) {
                    const t = ins[i];
                    if ((target && target instanceof t) || targetRef.isExtends(t)) {
                        found = true;
                        break;
                    }
                }
                if (!found && !annotation) {
                    return false;
                }
            }
            if (annotation) {
                const annoStr = annotation.toString();
                const anno = (annPreChkExp.test(annoStr) ? '' : '@') + annoStr;
                if (!targetRef || !targetRef.hasDecor(anno)) {
                    return false;
                }
            }
            if (aspectMeta.target && aspectMeta.target !== target) {
                return false;
            }

            if (accessor) {
                const optAccessor = options?.accessor;
                const optWay = options?.way;
                if (!optWay && !optAccessor) {
                    return false;
                }
                if (optAccessor !== accessor) {
                    if (!optWay && accessor !== 'value') {
                        return false;
                    }
                }
            } else if (options?.accessor) {
                return false;
            }

            if (isSelf === targetRef?.type) {
                return this.matchAspectSelf(name, aspectMeta);
            }
            return matchFn ? matchFn(name, fullName, targetRef, target, options) : false;
        }
    }

    protected matchAspectSelf(name: string | symbol, metadata: AdviceMetadata): boolean {
        if (metadata.pointcut) {
            let pointcut = metadata.pointcut;

            if (isString(pointcut)) {
                if (executionChkExp.test(pointcut)) {
                    pointcut = pointcut.substring(10, pointcut.length - 1)
                }
                return pointcut.startsWith(name.toString())
            } else if (isRegExp(pointcut)) {
                return pointcut.test(name.toString())
            }
        }
        return false
    }


    protected matchTypeFactory(metadata: AdviceMetadata): MatchExpress {
        if (isString(metadata.pointcut)) {
            const pointcuts = (metadata.pointcut || '').trim();
            return this.tranlateExpress(pointcuts, metadata)
        } else {
            const reg = metadata.pointcut;
            if (annPreChkExp.test(reg.source)) {
                return (method, fullName, targetRef) => targetRef.hasSomeDecor(n => reg.test(n.decorator!));
            } else {
                return (name, fullName) => reg.test(fullName!)
            }
        }

    }



    protected spiltBrace(strExp: string): string {
        strExp = strExp.trim();

        if (preParam.test(strExp) && endParam.test(strExp)) {
            strExp = strExp.substring(1, strExp.length - 1).trim()
        }

        if (preParam.test(strExp) && endParam.test(strExp)) {
            return this.spiltBrace(strExp)
        } else {
            return strExp
        }
    }

    protected expressToFunc(strExp: string, metadata: AdviceMetadata): MatchExpress {

        if (annContentExp.test(strExp)) {
            return this.toAnnExpress(strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1))
        }

        if (execContentExp.test(strExp)) {
            return this.toExecExpress(strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1))
        }

        if (withInChkExp.test(strExp)) {
            const classnames = strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1).split(',').map(n => n.trim());
            return (name, fullName, targetRef, target, options) => (options?.way != 'host') && classnames.indexOf(targetRef.className) >= 0
        }

        if (targetChkExp.test(strExp)) {
            const token = strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1).trim();
            const runtime = this.runtime;
            return (name, fullName, targetRef, target, options) => (options?.way != 'host') && runtime.getInjector(targetRef.type).has(token, InjectFlags.Self) //Operator.getTokenProvider(runtime.getInjector(targetRef.type), token) === targetRef.type
        }

        if (getPropExp.test(strExp)) {
            metadata.accessor = 'get';
            return this.toPropExpress(strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1))
        }
        if (setPropExp.test(strExp)) {
            metadata.accessor = 'set';
            return this.toPropExpress(strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1))
        }
        if (valuePropExp.test(strExp)) {
            metadata.accessor = 'value';
            return this.toPropExpress(strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1))
        }


        return fasleFn
    }

    protected toAnnExpress(exp: string): MatchExpress {
        let annotation = aExp.test(exp) ? exp : ('@' + exp);
        if (annInExp.test(annotation)) {
            const [ann, annIn] = annotation.split(':');
            annotation = ann;
            return (name, fullName, targetRef, target, options) => (options?.way != 'host') && targetRef.hasMetadata(annotation, annIn as DecoratorType, name)
        }
        return (name, fullName, targetRef, target, options) => (options?.way != 'host') && targetRef.hasMetadata(annotation, (!name || name === ctorName) ? Decors.CLASS : Decors.method, name)
    }

    protected toExecExpress(exp: string): MatchExpress {
        if (exp === '*') {
            exp = '*.*';
        }

        if (tgMthChkExp.test(exp)) {
            const paths = exp.split('.');
            let root$: RegExp | undefined;
            let host$: RegExp | undefined;
            const full = exp.replace(replAny, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                .replace(replAny1, '\\\w+')
                .replace(replDot, '\\\.')
                .replace(replNav, '\\\/');
            const matcher = new RegExp('^' + full + '$');
            
            if (paths.length > 2) {
                const hostExp = paths.slice(0, -1).join('.').replace(replAny, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                    .replace(replAny1, '\\\w+').replace(replDot, '\\\.');
                host$ = new RegExp('^' + hostExp + '$');
            }
            if (paths.length > 1) {
                const rootExp = paths.slice(0, 2).join('.').replace(replAny, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                    .replace(replAny1, '\\\w+').replace(replDot, '\\\.');
                root$ = new RegExp('^' + rootExp);
            }
            
            const isAspect = exp.startsWith('*.*');
            return (name, fullName, targetRef, target, options?: MatchOptions) => {
                if (isAspect && targetRef.getAnnotation<AopDef>().aspect) {
                    return false;
                }
                const way = options?.way;
                if (way === 'root') {
                    return root$ ? root$.test(fullName) : false;
                } else if (way === 'host') {
                    return host$ ? host$.test(fullName) : false;
                }
                return matcher.test(fullName);
            }
        }
        return fasleFn
    }

    protected toPropExpress(exp: string): MatchExpress {

        if (exp === '*') {
            exp = '*.*';
        }

        if (tgPropChkExp.test(exp)) {
            const paths = exp.split('.');
            let root$: RegExp | undefined;
            let host$: RegExp | undefined;
            const full = exp.replace(replAny, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                .replace(replAny1, '\\\w+').replace(replDot, '\\\.');
            const matcher = new RegExp(full + '$');
            
            if (paths.length > 2) {
                const hostExp = paths.slice(0, -1).join('.').replace(replAny, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                    .replace(replAny1, '\\\w+').replace(replDot, '\\\.');
                host$ = new RegExp('^' + hostExp + '$');
            }
            if (paths.length > 1) {
                const rootExp = paths.slice(0, 2).join('.').replace(replAny, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                    .replace(replAny1, '\\\w+').replace(replDot, '\\\.');
                root$ = new RegExp('^' + rootExp);
            }
            
            const isAspect = exp.startsWith('*.*');
            return (name, fullName, targetRef, target, options?: MatchOptions) => {
                if (isAspect && targetRef.getAnnotation<AopDef>().aspect) {
                    return false;
                }
                const way = options?.way;
                if (way === 'root') {
                    return root$ ? root$.test(fullName) : false;
                } else if (way === 'host') {
                    return host$ ? host$.test(fullName) : false;
                }
                return matcher.test(fullName);
            }
        }
        return fasleFn
    }

    protected tranlateExpress(strExp: string, metadata: AdviceMetadata): MatchExpress {
        if (!boolOper.test(strExp)) return this.expressToFunc(strExp, metadata);
        const exp = new BoolExpression(strExp, isAdviceToken);
        const fns = exp.tokens.map(t => this.expressToFunc(t, metadata));
        const operators = exp.getOperators();
        return (method: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions) => {
            let result = fns[0](method, fullName, targetRef, target, options);
            for (let i = 0; i < operators.length; i++) {
                const op = operators[i];
                if (op === '&&') {
                    if (!result) return false;
                    result = fns[i + 1](method, fullName, targetRef, target, options);
                } else if (op === '||') {
                    if (result) return true;
                    result = fns[i + 1](method, fullName, targetRef, target, options);
                }
            }
            return result;
        }
    }
}

export class BoolExpression {
    private _parsed: { type: string, value: string }[];
    constructor(express: string, isToken: (exp: string) => boolean = isAdviceToken) {
        const parts = express.split(boolOper);
        const keys: string[] = [];
        for (let i = 0; i < parts.length; i++) {
            let exp = parts[i].trim();

            while (exp && exp.startsWith('(')) {
                keys.push('(');
                exp = exp.substring(1);
            }

            if (isToken && isToken(exp)) {
                keys.push(exp)
            } else {
                if (exp.length > 1) {
                    const endOpt: string[] = [];
                    while (exp && exp.endsWith(')')) {
                        endOpt.unshift(')');
                        exp = exp.substring(0, exp.length - 1);
                        if (isToken && isToken(exp)) {
                            keys.push(exp);
                            exp = '';
                            break;
                        }
                    }
                    if (exp) {
                        const exps = exp.split(allOperators);
                        for (let e of exps) {
                            e = e.trim();
                            if (e) {
                                keys.push(e);
                            }
                        }
                    }
                    if (endOpt.length) {
                        keys.push(...endOpt);
                    }

                } else if (exp) {
                    keys.push(exp)
                }
            }
        }
        this._parsed = keys.filter(Boolean).reduce(rewrite, [])
    }

    private _tokens!: string[];
    get tokens() {
        if (!this._tokens) {
            this._tokens = this._parsed
                .map(e => e.type === 'token' ? e.value : undefined)
                .filter(Boolean) as string[]
        }
        return this._tokens
    }

    getOperators(): string[] {
        const ops: string[] = [];
        for (const item of this._parsed) {
            if (item.type === 'operator' && (item.value === '&&' || item.value === '||')) {
                ops.push(item.value);
            }
        }
        return ops;
    }

    toString(map?: (token: string, idx?: number, tokenIdx?: number, exp?: ExpToken[]) => string) {
        let idx = 0;
        return this._parsed.map((t, i, exp) => {
            if (t.type === 'operator') return t.value;
            return map ? map(t.value, i, idx++, exp) : t.value
        }).join(' ')
    }
}
type ExpToken = { type: string, value: string };

const boolOper = /(!|&&| AND | OR | NOT |\|\|)/g;
const allOperators = /(,|!|&&| AND | OR | NOT |\|\||\(|\)| )/g;
const nativeOperators = /^(,|!|&&|\|\||\(|\))$/
const operatorMap: Record<string, string> = { OR: '||', AND: '&&', NOT: '!' }
function rewrite(ex: ExpToken[], el: string) {
    let t = el.trim()
    if (!t) return ex;
    if (operatorMap[t]) {
        t = operatorMap[t]
    }
    if (nativeOperators.test(t)) {
        ex.push({ type: 'operator', value: t })
    } else {
        ex.push({ type: 'token', value: t.replace(/['\\]/g, '\\$&') })
    }
    return ex
}

export const isAdviceToken = (exp: string) => annContentExp.test(exp) || execContentExp.test(exp)
    || withInChkExp.test(exp) || targetChkExp.test(exp)
    || getPropExp.test(exp) || setPropExp.test(exp) || valuePropExp.test(exp);

const fasleFn = () => false;
const aExp = /^@/;
const annPreChkExp = /^\^?@\w+/;
const annContentExp = /^@annotation\(\w+(:(class|method|property|parameter))?\)$/;

const annInExp = /^@?\w+:(class|method|property|parameter)$/;

const executionChkExp = /^execution\(\S+\)$/;
const execContentExp = /^execution\(.*\)$/;
// const mthNameExp = /^\w+(\((\s*\w+\s*,)*\s*\w*\))?$/;
const tgMthChkExp = /^([\w\*]+\.)+[\w\*]+(\((\s*\w+\s*,)*\s*\w*\))?$/;
const tgPropChkExp = /^([\w\*]+\.)+[\w\*]+$/;

const preParam = /^\(/;
const endParam = /\)$/;
const withInChkExp = /^@within\(\s*\w+(\s*,\s*\w+)*\s*\)$/;
const targetChkExp = /^@target\(\s*\w+\s*\)$/;

const getPropExp = /^get\((\w|\*)+(.(\w|\*)+)*\)$/;
const setPropExp = /^set\((\w|\*)+(.(\w|\*)+)*\)$/;
const valuePropExp = /^value\((\w|\*)+(.(\w|\*)+)*\)$/;

const replAny = /\*\*/gi;
const replAny1 = /\*/gi;
const replDot = /\./gi;
const replNav = /\//gi;
