/* eslint-disable no-useless-escape */
import { isString, isRegExp, lang, isArray, ClassType, ctorName, Decors, Platform, Class } from '@tsdi/ioc';
import { AdviceMatcher } from './AdviceMatcher';
import { AdviceMetadata } from './metadata/meta';
import { IPointcut } from './joinpoints/IPointcut';
import { MatchPointcut } from './joinpoints/MatchPointcut';
import { AopDef } from './metadata/ref';

/**
 * match express.
 */
export type MatchExpress = (method?: string, fullName?: string, targetType?: ClassType, target?: any, pointcut?: IPointcut) => boolean;


/**
 * advice matcher, use to match advice when a registered create instance.
 * implements {@link IAdviceMatcher}.
 * @export
 * @class AdviceMatcher
 * @implements {IAdviceMatcher}
 */
export class DefaultAdviceMatcher implements AdviceMatcher {

    constructor(private platform: Platform) { }

    match(aspref: Class, tagref: Class, adviceMetas?: AdviceMetadata[]): MatchPointcut[] {
        const aopDef = aspref.getAnnotation<AopDef>();
        const aspectMeta = aopDef.aspect;
        if (aspectMeta) {
            if (aspectMeta.without) {
                const outs = isArray(aspectMeta.without) ? aspectMeta.without : [aspectMeta.without];
                if (outs.some(t => tagref.isExtends(t))) {
                    return []
                }
            }
            if (aspectMeta.within) {
                const ins = isArray(aspectMeta.within) ? aspectMeta.within : [aspectMeta.within];
                if (!ins.some(t => tagref.isExtends(t))) {
                    if (!aspectMeta.annotation) {
                        return []
                    }
                }
            }
            if (aspectMeta.annotation) {
                const annotation = aspectMeta.annotation.toString();
                const anno = (annPreChkExp.test(annotation) ? '' : '@') + annotation;
                if (!tagref.decors.some(d => d.decor === anno)) {
                    return []
                }
            }
        }

        const className = tagref.className;
        adviceMetas = adviceMetas || aopDef.advices;
        let matched: MatchPointcut[] = [];

        if (aspref.type === tagref.type) {
            const decorators = tagref.getPropertyDescriptors();
            for (const n in decorators) {
                adviceMetas.forEach(adv => {
                    if (this.matchAspectSelf(n, adv)) {
                        matched.push({
                            name: n,
                            fullName: `${className}.${n}`,
                            advice: adv
                        });
                    }
                })
            }
        } else {
            const points: IPointcut[] = [];
            const decorators = tagref.getPropertyDescriptors();
            // match method.
            for (const name in decorators) {
                points.push({
                    name: name,
                    fullName: `${className}.${name}`
                })
            }

            adviceMetas.forEach(metadata => {
                matched = matched.concat(this.filterPointcut(tagref, points, metadata))
            })
        }

        return matched
    }

    protected matchAspectSelf(name: string, metadata: AdviceMetadata): boolean {
        if (metadata.pointcut) {
            let pointcut = metadata.pointcut;

            if (isString(pointcut)) {
                if (executionChkExp.test(pointcut)) {
                    pointcut = pointcut.substring(10, pointcut.length - 1)
                }
                return pointcut.startsWith(name)
            } else if (isRegExp(pointcut)) {
                return pointcut.test(name)
            }
        }
        return false
    }

    filterPointcut(relfect: Class, points: IPointcut[], metadata: AdviceMetadata, target?: any): MatchPointcut[] {
        if (!metadata.pointcut) {
            return []
        }
        let matchedPointcut;
        if (metadata.pointcut) {
            const match = this.matchTypeFactory(relfect, metadata);
            matchedPointcut = points.filter(p => match(p.name, p.fullName, relfect.type, target, p))
        }

        matchedPointcut = matchedPointcut || [];
        return matchedPointcut.map(p => {
            return { ...p, advice: metadata }
        })
    }

    protected matchTypeFactory(relfect: Class, metadata: AdviceMetadata): MatchExpress {
        const checks = this.genChecks(relfect, metadata);
        return (method?: string, fullName?: string, targetType?: ClassType, target?: any, pointcut?: IPointcut) => checks.every(chk => chk(method, fullName, targetType, target, pointcut))
    }

    protected genChecks(relfect: Class, metadata: AdviceMetadata): MatchExpress[] {
        const checks: MatchExpress[] = [];
        if (metadata.within) {
            checks.push(() => {
                if (isArray(metadata.within)) {
                    return metadata.within.some(t => relfect.isExtends(t))
                } else {
                    return relfect.isExtends(metadata.within!)
                }
            })
        }
        if (metadata.target) {
            checks.push((method, fullName, targetType, target) => {
                return metadata.target === target
            })
        }

        if (metadata.annotation) {
            checks.push((method) => relfect.hasMetadata(metadata.annotation!, (!method || method === ctorName) ? Decors.CLASS : Decors.method, method))
        }

        if (isString(metadata.pointcut)) {
            const pointcuts = (metadata.pointcut || '').trim();
            checks.push(this.tranlateExpress(relfect, pointcuts))
        } else if (metadata.pointcut) {
            const reg = metadata.pointcut;
            if (annPreChkExp.test(reg.source)) {
                checks.push(() => relfect.decors.some(n => reg.test(n.decor)))
            } else {
                checks.push((name, fullName) => reg.test(fullName!))
            }
        }

        return checks
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

    protected expressToFunc(def: Class, strExp: string): MatchExpress {

        if (annContentExp.test(strExp)) {
            return this.toAnnExpress(def, strExp.substring(12, strExp.length - 1))
        }

        if (execContentExp.test(strExp)) {
            return this.toExecExpress(def, strExp.substring(10, strExp.length - 1))
        }

        if (withInChkExp.test(strExp)) {
            const classnames = strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1).split(',').map(n => n.trim());
            return (name?: string, fullName?: string, targetType?: ClassType) => targetType ? classnames.indexOf(lang.getClassName(targetType)) >= 0 : false
        }

        if (targetChkExp.test(strExp)) {
            const torken = strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1).trim();
            const platform = this.platform;
            return (name?: string, fullName?: string, targetType?: ClassType) => targetType ? platform.getInjector(def.type).getTokenProvider(torken) === targetType : false
        }

        return fasleFn
    }

    protected toAnnExpress(def: Class, exp: string): MatchExpress {
        const annotation = aExp.test(exp) ? exp : ('@' + exp);
        return (name?: string, fullName?: string) => def.hasMetadata(annotation, (!name || name === ctorName) ? Decors.CLASS : Decors.method, name)
    }

    protected toExecExpress(def: Class, exp: string): MatchExpress {
        if (exp === '*' || exp === '*.*') {
            return (name?: string, fullName?: string) => !!name && !def.getAnnotation<AopDef>().aspect
        }

        if (mthNameExp.test(exp)) {
            // if is method name, will match aspect self only.
            return fasleFn
        }

        if (tgMthChkExp.test(exp)) {
            exp = exp.replace(replAny, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                .replace(replAny1, '\\\w+')
                .replace(replDot, '\\\.')
                .replace(replNav, '\\\/');

            const matcher = new RegExp(exp + '$');
            return (name?: string, fullName?: string) => fullName ? matcher.test(fullName) : false
        }
        return fasleFn
    }

    protected tranlateExpress(def: Class, strExp: string): MatchExpress {
        if (!boolOper.test(strExp)) return this.expressToFunc(def, strExp);
        const exp = new BoolExpression(strExp, isBoolToken);
        const fns = exp.tokens.map(t => this.expressToFunc(def, t));
        const argnames = exp.tokens.map((t, i) => 'arg' + i);
        const boolexp = new Function(...argnames, `return ${exp.toString((t, i, tkidx) => 'arg' + tkidx + '()')}`);
        return (method?: string, fullName?: string, targetType?: ClassType, target?: any, pointcut?: IPointcut) => {
            const args = fns.map(fn => () => fn(method, fullName, targetType, target, pointcut));
            return boolexp(...args)
        }
    }
}

export class BoolExpression {
    private _parsed: { type: string, value: any }[];
    constructor(express: string, isToken?: (exp: string) => boolean) {
        const parts = express.split(boolOper);
        const keys: string[] = [];
        parts.forEach(exp => {
            exp = exp.trim();
            if (isToken && isToken(exp)) {
                keys.push(exp)
            } else {
                if (exp.length > 1) {
                    keys.push(...exp.split(allOperators))
                } else if (exp) {
                    keys.push(exp)
                }
            }
        })
        this._parsed = keys.filter(Boolean).reduce(rewrite, [])
    }

    private _tokens!: any[];
    get tokens() {
        if (!this._tokens) {
            this._tokens = this._parsed
                .map(e => e.type === 'token' ? e.value : undefined)
                .filter(Boolean)
        }
        return this._tokens
    }

    toString(map?: (token: string, idx?: number, tokenIdx?: number, exp?: { type: string, value: any }[]) => string) {
        let idx = 0;
        return this._parsed.map((t, i, exp) => {
            if (t.type === 'operator') return t.value;
            return map ? map(t.value, i, idx++, exp) : t.value
        }).join(' ')
    }
}

const boolOper = /(!|&&| AND | OR | NOT |\|\|)/g;
const allOperators = /(,|!|&&| AND | OR | NOT |\|\||\(|\)| )/g;
const nativeOperators = /^(,|!|&&|\|\||\(|\))$/
const operatorMap: any = { OR: '||', AND: '&&', NOT: '!' }
function rewrite(ex: any[], el: string) {
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

const isBoolToken = (exp: string) => annContentExp.test(exp) || execContentExp.test(exp) || withInChkExp.test(exp) || targetChkExp.test(exp);

const fasleFn = () => false;
const aExp = /^@/;
const annPreChkExp = /^\^?@\w+/;
const annContentExp = /^@annotation\(.*\)$/;
const executionChkExp = /^execution\(\S+\)$/;
const execContentExp = /^execution\(.*\)$/;
const mthNameExp = /^\w+(\((\s*\w+\s*,)*\s*\w*\))?$/;
const tgMthChkExp = /^([\w\*]+\.)+[\w\*]+(\((\s*\w+\s*,)*\s*\w*\))?$/;
const preParam = /^\(/;
const endParam = /\)$/;
const withInChkExp = /^@within\(\s*\w+/;
const targetChkExp = /^@target\(\s*\w+/;
const replAny = /\*\*/gi;
const replAny1 = /\*/gi;
const replDot = /\./gi;
const replNav = /\//gi;