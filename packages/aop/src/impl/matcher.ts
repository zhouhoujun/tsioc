/* eslint-disable no-useless-escape */
import { isString, isRegExp, lang, isArray, Type, ctorName, Decors, Platform, Class, DecoratorType, isType } from '@tsdi/ioc';
import { AdviceMatcher } from '../AdviceMatcher';
import { AdviceMetadata } from '../metadata/meta';
import { IPointcut } from '../joinpoints/IPointcut';
// import { MatchPointcut } from '../joinpoints/MatchPointcut';
import { AopDef } from '../metadata/ref';
import { MatchExpress, MatchOptions } from '../advices/Advicer';

/**
 * advice matcher, use to match advice when a registered create instance.
 * implements {@link IAdviceMatcher}.
 * @export
 * @class AdviceMatcher
 * @implements {IAdviceMatcher}
 */
export class DefaultAdviceMatcher implements AdviceMatcher {

    constructor(private platform: Platform) { }


    createMatch(aspectMeta: AdviceMetadata): MatchExpress {
        if (aspectMeta.matchFn == undefined) {
            aspectMeta.matchFn = aspectMeta.pointcut ? this.matchTypeFactory(aspectMeta) : null;
        }
        return (name, fullName, targetRef, target, options?: MatchOptions) => {

            if (aspectMeta.without) {
                const outs = isArray(aspectMeta.without) ? aspectMeta.without : [aspectMeta.without];
                if (outs.some(t => (target && target instanceof t) || targetRef?.isExtends(t))) {
                    return false
                }
            }
            if (aspectMeta.within) {
                const ins = isArray(aspectMeta.within) ? aspectMeta.within : [aspectMeta.within];
                if (!ins.some(t => (target && target instanceof t) || targetRef?.isExtends(t))) {
                    if (!aspectMeta.annotation) {
                        return false
                    }
                }
            }
            if (aspectMeta.annotation) {
                const annotation = aspectMeta.annotation.toString();
                const anno = (annPreChkExp.test(annotation) ? '' : '@') + annotation;
                if (!targetRef || !targetRef.defs.some(d => d.decor.toString() === anno)) {
                    return false
                }
            }

            if (options?.accessor && aspectMeta.accessor) {
                if (options.accessor !== aspectMeta.accessor) {
                    return false;
                }
            }

            if (aspectMeta.target) {
                return aspectMeta.target === target;
            }

            if (aspectMeta.type === targetRef?.type) {
                return this.matchAspectSelf(name, aspectMeta);
            } else {
                if (aspectMeta.type === targetRef?.type) {
                    return this.matchAspectSelf(name, aspectMeta);
                } else {
                    const matchFn = aspectMeta.matchFn;
                    return matchFn ? matchFn(name, fullName, targetRef, target, options) : false;
                }
            }
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


    // match(aspref: Class, tagref: Class, adviceMetas?: AdviceMetadata[]): MatchPointcut[] {
    //     const aopDef = aspref.getAnnotation<AopDef>();
    //     const aspectMeta = aopDef.aspect;
    //     if (aspectMeta) {
    //         if (aspectMeta.without) {
    //             const outs = isArray(aspectMeta.without) ? aspectMeta.without : [aspectMeta.without];
    //             if (outs.some(t => tagref.isExtends(t))) {
    //                 return []
    //             }
    //         }
    //         if (aspectMeta.within) {
    //             const ins = isArray(aspectMeta.within) ? aspectMeta.within : [aspectMeta.within];
    //             if (!ins.some(t => tagref.isExtends(t))) {
    //                 if (!aspectMeta.annotation) {
    //                     return []
    //                 }
    //             }
    //         }
    //         if (aspectMeta.annotation) {
    //             const annotation = aspectMeta.annotation.toString();
    //             const anno = (annPreChkExp.test(annotation) ? '' : '@') + annotation;
    //             if (!tagref.defs.some(d => d.decor.toString() === anno)) {
    //                 return []
    //             }
    //         }
    //     }

    //     const className = tagref.className;
    //     adviceMetas = adviceMetas || aopDef.advices;
    //     let matched: MatchPointcut[] = [];

    //     if (aspref.type === tagref.type) {
    //         const decorators = tagref.getPropertyDescriptors();
    //         for (const n in decorators) {
    //             adviceMetas.forEach(adv => {
    //                 if (this.matchAspectSelf(n, adv)) {
    //                     matched.push({
    //                         name: n,
    //                         fullName: `${className}.${n}`,
    //                         advice: adv
    //                     });
    //                 }
    //             })
    //         }
    //     } else {
    //         const points: IPointcut[] = [];
    //         const decorators = tagref.getPropertyDescriptors();
    //         // match method or property.
    //         for (const name in decorators) {
    //             points.push({
    //                 name: name,
    //                 fullName: `${className}.${name}`
    //             })
    //         }

    //         const pmaps: Record<string | symbol, IPointcut> = {};
    //         tagref.eachProperty((v, k) => {
    //             let p = pmaps[k];
    //             if (!p) {
    //                 const m = v.find(r => r.provider) ?? v.find(r => r.type);
    //                 const type = isType(m?.provider) ? m.provider : m?.type;
    //                 p = {
    //                     name: k,
    //                     fullName: `${className}.${k.toString()}`,
    //                     type,
    //                     accessor: 'value'
    //                 }
    //                 pmaps[k] = p;
    //             } else if (!p.type) {
    //                 const m = v.find(r => r.provider) ?? v.find(r => r.type);
    //                 p.type = isType(m?.provider) ? m.provider : m?.type;
    //             }
    //         });

    //         for (const pr of Object.values(pmaps)) {
    //             points.push(pr);
    //         }

    //         adviceMetas.forEach(metadata => {
    //             matched = matched.concat(this.filterPointcut(tagref, points, metadata))
    //         })
    //     }

    //     return matched
    // }
    // protected filterPointcut(targetRef: Class, points: IPointcut[], metadata: AdviceMetadata, target?: any): MatchPointcut[] {
    //     if (!metadata.pointcut) {
    //         return []
    //     }
    //     let matchedPointcut;

    //     if (metadata.pointcut) {
    //         let matchFn = metadata.matchFn;
    //         if (!matchFn) {
    //             matchFn = metadata.matchFn = this.matchTypeFactory(metadata);
    //         }
    //         matchedPointcut = points.filter(p => matchFn(p.name, p.fullName, targetRef, target, p))
    //     }

    //     matchedPointcut = matchedPointcut || [];
    //     return matchedPointcut.map(p => {
    //         return { ...p, advice: metadata }
    //     })
    // }

    protected matchTypeFactory(metadata: AdviceMetadata): MatchExpress {
        if (isString(metadata.pointcut)) {
            const pointcuts = (metadata.pointcut || '').trim();
            return this.tranlateExpress(pointcuts, metadata)
        } else {
            const reg = metadata.pointcut;
            if (annPreChkExp.test(reg.source)) {
                return (method, fullName, targetRef) => targetRef?.defs.some(n => reg.test(n.decor.toString())) === true;
            } else {
                return (name, fullName) => reg.test(fullName!)
            }
        }
        // const checks = this.genChecks(metadata);
        // return (method: string | symbol, fullName: string, targetRef: Class, target?: any, pointcut?: IPointcut) => checks.every(chk => chk(method, fullName, targetRef, target, pointcut))
    }

    // protected genChecks(metadata: AdviceMetadata): MatchExpress[] {
    //     const checks: MatchExpress[] = [];
    //     if (metadata.within) {
    //         checks.push((name, fullName, targetRef, target) => {
    //             if (isArray(metadata.within)) {
    //                 return metadata.within.some(t =>  targetRef?.isExtends(t))
    //             } else {
    //                 return targetRef.isExtends(metadata.within!)
    //             }
    //         })
    //     }
    //     if (metadata.target) {
    //         checks.push((method, fullName, targetRef, target) => {
    //             return metadata.target === target
    //         })
    //     }

    //     if (metadata.annotation) {
    //         checks.push((method, fullName, targetRef) => targetRef.hasMetadata(metadata.annotation!, (!method || method === ctorName) ? Decors.CLASS : Decors.method, method))
    //     }

    //     if (isString(metadata.pointcut)) {
    //         const pointcuts = (metadata.pointcut || '').trim();
    //         checks.push(this.tranlateExpress(pointcuts))
    //     } else if (metadata.pointcut) {
    //         const reg = metadata.pointcut;
    //         if (annPreChkExp.test(reg.source)) {
    //             checks.push((method, fullName, targetRef) => targetRef?.defs.some(n => reg.test(n.decor.toString())) === true)
    //         } else {
    //             checks.push((name, fullName) => reg.test(fullName!))
    //         }
    //     }

    //     return checks
    // }

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
            return (name, fullName, targetRef) => targetRef ? classnames.indexOf(targetRef.className) >= 0 : false
        }

        if (targetChkExp.test(strExp)) {
            const torken = strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1).trim();
            const platform = this.platform;
            return (name, fullName, targetRef) => targetRef ? platform.getInjector(targetRef.type).getTokenProvider(torken) === targetRef.type : false
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
            return this.toPropExpress(strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1))
        }


        return fasleFn
    }

    protected toAnnExpress(exp: string): MatchExpress {
        let annotation = aExp.test(exp) ? exp : ('@' + exp);
        if (annInExp.test(annotation)) {
            const [ann, annIn] = annotation.split(':');
            annotation = ann;
            return (name, fullName, targetRef) => targetRef?.hasMetadata(annotation, annIn as DecoratorType, name) === true
        }
        return (name, fullName, targetRef) => targetRef?.hasMetadata(annotation, (!name || name === ctorName) ? Decors.CLASS : Decors.method, name) === true
    }

    protected toExecExpress(exp: string): MatchExpress {
        if (exp === '*') {
            exp = '*.*';
        }

        // if (mthNameExp.test(exp)) {
        //     // if is method name, will match aspect self only.
        //     return fasleFn
        // }

        if (tgMthChkExp.test(exp)) {
            const paths = exp.split('.').filter(r => r);
            let root$: RegExp | undefined;
            let host$: RegExp | undefined;
            if (paths.length > 2) {
                let hostExp = paths.slice(0, paths.length - 1).join('.');
                hostExp = hostExp.replace(replAny, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                    .replace(replAny1, '\\\w+')
                    .replace(replDot, '\\\.')
                    .replace(replNav, '\\\/');
                host$ = new RegExp('^'+ hostExp + '$');
            }
            if (paths.length > 1) {
                let rootExp = paths.slice(0, 2).join('.');
                rootExp = rootExp.replace(replAny, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                    .replace(replAny1, '\\\w+')
                    .replace(replDot, '\\\.')
                    .replace(replNav, '\\\/');
                root$ = new RegExp('^'+rootExp);
            }
            exp = exp.replace(replAny, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                .replace(replAny1, '\\\w+')
                .replace(replDot, '\\\.')
                .replace(replNav, '\\\/');

            const matcher = new RegExp('^'+ exp + '$');
            return (name, fullName, targetRef, target, options?: MatchOptions) => {
                if (options?.way === 'root') {
                    return root$ ? root$.test(fullName) : false;
                } else if (options?.way === 'host') {
                    return host$ ? host$.test(fullName) : false;
                }
                return matcher.test(fullName)
            }
        }
        return fasleFn
    }

    protected toPropExpress(exp: string): MatchExpress {

        if (exp === '*') {
            exp = '*.*';
        }

        // if (mthNameExp.test(exp)) {
        //     // if is method name, will match aspect self only.
        //     return fasleFn
        // }

        if (tgPropChkExp.test(exp)) {
            const paths = exp.split('.').filter(r => r);
            let root$: RegExp | undefined;
            let host$: RegExp | undefined;
            if (paths.length > 2) {
                let hostExp = paths.slice(0, paths.length - 1).join('.');
                hostExp = hostExp.replace(replAny, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                    .replace(replAny1, '\\\w+')
                    .replace(replDot, '\\\.')
                    .replace(replNav, '\\\/');
                host$ = new RegExp('^'+ hostExp + '$');
            }
            if (paths.length > 1) {
                let rootExp = paths.slice(0, 2).join('.');
                rootExp = rootExp.replace(replAny, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                    .replace(replAny1, '\\\w+')
                    .replace(replDot, '\\\.')
                    .replace(replNav, '\\\/');
                root$ = new RegExp('^'+rootExp);
            }
            exp = exp.replace(replAny, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                .replace(replAny1, '\\\w+')
                .replace(replDot, '\\\.')
                .replace(replNav, '\\\/');

            const matcher = new RegExp(exp + '$');
            return (name, fullName, targetRef, target, options?: MatchOptions) => {
                if (options?.way === 'root') {
                    return root$ ? root$.test(fullName) : false;
                } else if (options?.way === 'host') {
                    return host$ ? host$.test(fullName) : false;
                }
                return matcher.test(fullName)
            }
        }
        return fasleFn
    }

    protected tranlateExpress(strExp: string, metadata: AdviceMetadata): MatchExpress {
        if (!boolOper.test(strExp)) return this.expressToFunc(strExp, metadata);
        const exp = new BoolExpression(strExp, isAdviceToken);
        const fns = exp.tokens.map(t => this.expressToFunc(t, metadata));
        const argnames = exp.tokens.map((t, i) => 'arg' + i);
        const boolexp = new Function(...argnames, `return ${exp.toString((t, i, tkidx) => 'arg' + tkidx + '()')}`);
        return (method: string | symbol, fullName: string, targetRef?: Class | null, target?: any) => {
            const args = fns.map(fn => () => fn(method, fullName, targetRef, target));
            return boolexp(...args)
        }
    }
}

export class BoolExpression {
    private _parsed: { type: string, value: any }[];
    constructor(express: string, isToken: (exp: string) => boolean = isAdviceToken) {
        const parts = express.split(boolOper);
        const keys: string[] = [];
        parts.forEach(exp => {
            exp = exp.trim();
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
                        exp.split(allOperators).forEach(e => {
                            e = e.trim();
                            if (e) {
                                keys.push(e);
                            }
                        });
                    }
                    if (endOpt.length) {
                        keys.push(...endOpt);
                    }

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

// export class BoolExpression {
//     private _parsed: { type: string, value: any }[];
//     constructor(express: string, isToken: (exp: string) => boolean = isAdviceToken) {
//         const tokens = this.tokenize(express, isToken);
//         this._parsed = this.parseTokens(tokens);
//     }

//     private tokenize(express: string, isToken: (exp: string) => boolean): string[] {
//         // 使用正则表达式拆分表达式为token
//         return express.match(/(@\w+\([^)]*\)|\(|\)|\|\||&&|!|AND|OR|NOT|[\w.]+|\S)/g) || [];
//     }

//     private parseTokens(tokens: string[]): any[] {
//         const output: any[] = [];
//         const operators: string[] = [];

//         tokens.forEach(token => {
//             token = token.trim();
//             if (!token) return;

//             if (token === '(') {
//                 operators.push(token);
//             } else if (token === ')') {
//                 // 处理括号闭合
//                 while (operators.length && operators[operators.length - 1] !== '(') {
//                     output.push({ type: 'operator', value: operators.pop() });
//                 }
//                 operators.pop(); // 移除 '('
//             } else if (boolOper.test(token)) {
//                 // 处理操作符优先级
//                 const op = operatorMap[token] || token;
//                 while (operators.length && this.getPrecedence(operators[operators.length - 1]) >= this.getPrecedence(op)) {
//                     output.push({ type: 'operator', value: operators.pop() });
//                 }
//                 operators.push(op);
//             } else {
//                 // 处理普通token
//                 output.push({ type: 'token', value: token });
//             }
//         });

//         // 添加剩余操作符
//         while (operators.length) {
//             output.push({ type: 'operator', value: operators.pop() });
//         }

//         return output;
//     }

//     private getPrecedence(op: string): number {
//         switch (op) {
//             case '!': return 3;
//             case '&&': return 2;
//             case '||': return 1;
//             default: return 0;
//         }
//     }

//     private _tokens!: any[];
//     get tokens() {
//         if (!this._tokens) {
//             this._tokens = this._parsed
//                 .filter(t => t.type === 'token')
//                 .map(t => t.value);
//         }
//         return this._tokens;
//     }

//     toString(map?: (token: string, idx?: number, tokenIdx?: number) => string): string {
//         const stack: {value: string, precedence: number}[] = [];
//         let tokenIdx = 0;

//         this._parsed.forEach(item => {
//             if (item.type === 'token') {
//                 const mapped = map ? map(item.value, tokenIdx, tokenIdx++) : item.value;
//                 stack.push({value: mapped, precedence: 0});
//             } else {
//                 const right = stack.pop()!;
//                 const left = stack.pop()!;
//                 const currentPrecedence = this.getPrecedence(item.value);

//                 // 处理括号分组
//                 const leftValue = left.precedence < currentPrecedence ? `(${left.value})` : left.value;
//                 const rightValue = right.precedence < currentPrecedence ? `(${right.value})` : right.value;

//                 stack.push({
//                     value: `${leftValue} ${item.value} ${rightValue}`,
//                     precedence: currentPrecedence
//                 });
//             }
//         });

//         // 最终格式化处理
//         return stack[0].value
//             .replace(/\(\s+/g, '(')
//             .replace(/\s+\)/g, ')')
//             .replace(/\s+/g, ' ')
//             .trim();
//     }
// }

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
