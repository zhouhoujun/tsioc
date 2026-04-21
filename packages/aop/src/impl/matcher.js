"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdviceToken = exports.BoolExpression = exports.DefaultAdviceMatcher = void 0;
/* eslint-disable no-useless-escape */
const ioc_1 = require("@tsdi/ioc");
/**
 * advice matcher, use to match advice when a registered create instance.
 * implements {@link IAdviceMatcher}.
 * @export
 * @class AdviceMatcher
 * @implements {IAdviceMatcher}
 */
class DefaultAdviceMatcher {
    constructor(runtime) {
        this.runtime = runtime;
    }
    parse(aspectMeta) {
        if (aspectMeta.matchFn == undefined) {
            aspectMeta.matchFn = aspectMeta.pointcut ? this.matchTypeFactory(aspectMeta) : null;
        }
        const without = aspectMeta.without;
        const within = aspectMeta.within;
        const annotation = aspectMeta.annotation;
        const accessor = aspectMeta.accessor;
        const matchFn = aspectMeta.matchFn;
        const isSelf = aspectMeta.type;
        return (name, fullName, targetRef, target, options) => {
            if (without) {
                const outs = (0, ioc_1.isArray)(without) ? without : [without];
                for (let i = 0, len = outs.length; i < len; i++) {
                    const t = outs[i];
                    if ((target && target instanceof t) || targetRef.isExtends(t)) {
                        return false;
                    }
                }
            }
            if (within) {
                const ins = (0, ioc_1.isArray)(within) ? within : [within];
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
            }
            else if (options?.accessor) {
                return false;
            }
            if (isSelf === targetRef?.type) {
                return this.matchAspectSelf(name, aspectMeta);
            }
            return matchFn ? matchFn(name, fullName, targetRef, target, options) : false;
        };
    }
    matchAspectSelf(name, metadata) {
        if (metadata.pointcut) {
            let pointcut = metadata.pointcut;
            if ((0, ioc_1.isString)(pointcut)) {
                if (executionChkExp.test(pointcut)) {
                    pointcut = pointcut.substring(10, pointcut.length - 1);
                }
                return pointcut.startsWith(name.toString());
            }
            else if ((0, ioc_1.isRegExp)(pointcut)) {
                return pointcut.test(name.toString());
            }
        }
        return false;
    }
    matchTypeFactory(metadata) {
        if ((0, ioc_1.isString)(metadata.pointcut)) {
            const pointcuts = (metadata.pointcut || '').trim();
            return this.tranlateExpress(pointcuts, metadata);
        }
        else {
            const reg = metadata.pointcut;
            if (annPreChkExp.test(reg.source)) {
                return (method, fullName, targetRef) => targetRef.hasSomeDecor(n => reg.test(n.decorator));
            }
            else {
                return (name, fullName) => reg.test(fullName);
            }
        }
    }
    spiltBrace(strExp) {
        strExp = strExp.trim();
        if (preParam.test(strExp) && endParam.test(strExp)) {
            strExp = strExp.substring(1, strExp.length - 1).trim();
        }
        if (preParam.test(strExp) && endParam.test(strExp)) {
            return this.spiltBrace(strExp);
        }
        else {
            return strExp;
        }
    }
    expressToFunc(strExp, metadata) {
        if (annContentExp.test(strExp)) {
            return this.toAnnExpress(strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1));
        }
        if (execContentExp.test(strExp)) {
            return this.toExecExpress(strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1));
        }
        if (withInChkExp.test(strExp)) {
            const classnames = strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1).split(',').map(n => n.trim());
            return (name, fullName, targetRef, target, options) => (options?.way != 'host') && classnames.indexOf(targetRef.className) >= 0;
        }
        if (targetChkExp.test(strExp)) {
            const token = strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1).trim();
            const runtime = this.runtime;
            return (name, fullName, targetRef, target, options) => (options?.way != 'host') && runtime.getInjector(targetRef.type).has(token, ioc_1.InjectFlags.Self); //Operator.getTokenProvider(runtime.getInjector(targetRef.type), token) === targetRef.type
        }
        if (getPropExp.test(strExp)) {
            metadata.accessor = 'get';
            return this.toPropExpress(strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1));
        }
        if (setPropExp.test(strExp)) {
            metadata.accessor = 'set';
            return this.toPropExpress(strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1));
        }
        if (valuePropExp.test(strExp)) {
            metadata.accessor = 'value';
            return this.toPropExpress(strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1));
        }
        return fasleFn;
    }
    toAnnExpress(exp) {
        let annotation = aExp.test(exp) ? exp : ('@' + exp);
        if (annInExp.test(annotation)) {
            const [ann, annIn] = annotation.split(':');
            annotation = ann;
            return (name, fullName, targetRef, target, options) => (options?.way != 'host') && targetRef.hasMetadata(annotation, annIn, name);
        }
        return (name, fullName, targetRef, target, options) => (options?.way != 'host') && targetRef.hasMetadata(annotation, (!name || name === ioc_1.ctorName) ? ioc_1.Decors.CLASS : ioc_1.Decors.method, name);
    }
    toExecExpress(exp) {
        if (exp === '*') {
            exp = '*.*';
        }
        if (tgMthChkExp.test(exp)) {
            const paths = exp.split('.');
            let root$;
            let host$;
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
            return (name, fullName, targetRef, target, options) => {
                if (isAspect && targetRef.getAnnotation().aspect) {
                    return false;
                }
                const way = options?.way;
                if (way === 'root') {
                    return root$ ? root$.test(fullName) : false;
                }
                else if (way === 'host') {
                    return host$ ? host$.test(fullName) : false;
                }
                return matcher.test(fullName);
            };
        }
        return fasleFn;
    }
    toPropExpress(exp) {
        if (exp === '*') {
            exp = '*.*';
        }
        if (tgPropChkExp.test(exp)) {
            const paths = exp.split('.');
            let root$;
            let host$;
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
            return (name, fullName, targetRef, target, options) => {
                if (isAspect && targetRef.getAnnotation().aspect) {
                    return false;
                }
                const way = options?.way;
                if (way === 'root') {
                    return root$ ? root$.test(fullName) : false;
                }
                else if (way === 'host') {
                    return host$ ? host$.test(fullName) : false;
                }
                return matcher.test(fullName);
            };
        }
        return fasleFn;
    }
    tranlateExpress(strExp, metadata) {
        if (!boolOper.test(strExp))
            return this.expressToFunc(strExp, metadata);
        const exp = new BoolExpression(strExp, exports.isAdviceToken);
        const fns = exp.tokens.map(t => this.expressToFunc(t, metadata));
        const argnames = exp.tokens.map((t, i) => 'arg' + i);
        const boolexp = new Function(...argnames, `return ${exp.toString((t, i, tkidx) => 'arg' + tkidx + '()')}`);
        return (method, fullName, targetRef, target, options) => {
            const args = fns.map(fn => () => fn(method, fullName, targetRef, target, options));
            return boolexp(...args);
        };
    }
}
exports.DefaultAdviceMatcher = DefaultAdviceMatcher;
class BoolExpression {
    constructor(express, isToken = exports.isAdviceToken) {
        const parts = express.split(boolOper);
        const keys = [];
        for (let i = 0; i < parts.length; i++) {
            let exp = parts[i].trim();
            while (exp && exp.startsWith('(')) {
                keys.push('(');
                exp = exp.substring(1);
            }
            if (isToken && isToken(exp)) {
                keys.push(exp);
            }
            else {
                if (exp.length > 1) {
                    const endOpt = [];
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
                }
                else if (exp) {
                    keys.push(exp);
                }
            }
        }
        this._parsed = keys.filter(Boolean).reduce(rewrite, []);
    }
    get tokens() {
        if (!this._tokens) {
            this._tokens = this._parsed
                .map(e => e.type === 'token' ? e.value : undefined)
                .filter(Boolean);
        }
        return this._tokens;
    }
    toString(map) {
        let idx = 0;
        return this._parsed.map((t, i, exp) => {
            if (t.type === 'operator')
                return t.value;
            return map ? map(t.value, i, idx++, exp) : t.value;
        }).join(' ');
    }
}
exports.BoolExpression = BoolExpression;
const boolOper = /(!|&&| AND | OR | NOT |\|\|)/g;
const allOperators = /(,|!|&&| AND | OR | NOT |\|\||\(|\)| )/g;
const nativeOperators = /^(,|!|&&|\|\||\(|\))$/;
const operatorMap = { OR: '||', AND: '&&', NOT: '!' };
function rewrite(ex, el) {
    let t = el.trim();
    if (!t)
        return ex;
    if (operatorMap[t]) {
        t = operatorMap[t];
    }
    if (nativeOperators.test(t)) {
        ex.push({ type: 'operator', value: t });
    }
    else {
        ex.push({ type: 'token', value: t.replace(/['\\]/g, '\\$&') });
    }
    return ex;
}
const isAdviceToken = (exp) => annContentExp.test(exp) || execContentExp.test(exp)
    || withInChkExp.test(exp) || targetChkExp.test(exp)
    || getPropExp.test(exp) || setPropExp.test(exp) || valuePropExp.test(exp);
exports.isAdviceToken = isAdviceToken;
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
//# sourceMappingURL=matcher.js.map