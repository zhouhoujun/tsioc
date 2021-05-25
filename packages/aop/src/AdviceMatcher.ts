import { isString, isRegExp, Type, lang, isArray, isFunction, refl, ClassType, IContainer, isNil } from '@tsdi/ioc';
import { IAdviceMatcher } from './IAdviceMatcher';
import { AdviceMetadata } from './metadata/meta';
import { IPointcut } from './joinpoints/IPointcut';
import { MatchPointcut } from './joinpoints/MatchPointcut';
import { AopReflect } from './metadata/ref';

/**
 * match express.
 */
export type MatchExpress = (method: string, fullName: string, targetType?: ClassType, target?: any, pointcut?: IPointcut) => boolean;



/**
 * advice matcher, use to match advice when a registered create instance.
 *
 * @export
 * @class AdviceMatcher
 * @implements {IAdviceMatcher}
 */
export class AdviceMatcher implements IAdviceMatcher {

    constructor(private container: IContainer) { }

    match(aspectType: Type, targetType: Type, adviceMetas?: AdviceMetadata[], target?: any): MatchPointcut[] {
        const aspref = refl.get<AopReflect>(aspectType);
        const tagref = refl.get<AopReflect>(targetType);
        let aspectMeta = aspref.aspect;
        if (aspectMeta) {
            if (aspectMeta.without) {
                let outs = isArray(aspectMeta.without) ? aspectMeta.without : [aspectMeta.without];
                if (outs.some(t => tagref.class.isExtends(t))) {
                    return [];
                }
            }
            if (aspectMeta.within) {
                let ins = isArray(aspectMeta.within) ? aspectMeta.within : [aspectMeta.within];
                if (!ins.some(t => tagref.class.isExtends(t))) {
                    if (!aspectMeta.annotation) {
                        return [];
                    }
                }
            }
            if (aspectMeta.annotation) {
                let annotation = isFunction(aspectMeta.annotation) ? aspectMeta.annotation.toString() : aspectMeta.annotation;
                let anno = (annPreChkExp.test(annotation) ? '' : '@') + annotation;
                if (!tagref.class.decors.some(d => d.decor === anno)) {
                    return [];
                }
            }
        }

        const className = tagref.class.className;
        adviceMetas = adviceMetas || aspref.advices;
        let matched: MatchPointcut[] = [];

        if (targetType === aspectType) {
            let decorators = tagref.class.getPropertyDescriptors();
            for (let n in decorators) {
                adviceMetas.forEach(adv => {
                    if (this.matchAspectSelf(n, adv)) {
                        matched.push({
                            name: n,
                            fullName: `${className}.${n}`,
                            advice: adv
                        });
                    }
                });
            }
        } else {
            const points: IPointcut[] = [];
            const decorators = tagref.class.getPropertyDescriptors();
            // match method.
            for (let name in decorators) {
                points.push({
                    name: name,
                    fullName: `${className}.${name}`
                });
            }

            adviceMetas.forEach(metadata => {
                matched = matched.concat(this.filterPointcut(tagref, points, metadata));
            });
        }

        return matched;
    }

    protected matchAspectSelf(name: string, metadata: AdviceMetadata): boolean {
        if (metadata.pointcut) {
            let pointcut = metadata.pointcut;

            if (isString(pointcut)) {
                if (executionChkExp.test(pointcut)) {
                    pointcut = pointcut.substring(10, pointcut.length - 1);
                }
                return pointcut.startsWith(name);
            } else if (isRegExp(pointcut)) {
                return pointcut.test(name);
            }
        }
        return false;
    }

    filterPointcut(relfect: AopReflect, points: IPointcut[], metadata: AdviceMetadata, target?: any): MatchPointcut[] {
        if (!metadata.pointcut) {
            return [];
        }
        let matchedPointcut;
        if (metadata.pointcut) {
            let match = this.matchTypeFactory(relfect, metadata);
            matchedPointcut = points.filter(p => match(p.name, p.fullName, relfect.type, target, p))
        }

        matchedPointcut = matchedPointcut || [];
        return matchedPointcut.map(p => {
            return Object.assign({}, p, { advice: metadata });
        });
    }

    protected matchTypeFactory(relfect: AopReflect, metadata: AdviceMetadata): MatchExpress {
        let expresses: (MatchExpress | string)[] = [];
        if (metadata.within) {
            expresses.push((method: string, fullName: string, targetType?: ClassType) => {
                if (isArray(metadata.within)) {
                    return metadata.within.some(t => relfect.class.isExtends(t));
                } else {
                    return relfect.class.isExtends(metadata.within);
                }
            });
            expresses.push('&&')
        }
        if (metadata.target) {
            expresses.push((method: string, fullName: string, targetType?: ClassType, target?: any) => {
                return metadata.target = target;
            });
            expresses.push('&&')
        }

        if (metadata.annotation) {
            expresses.push((method: string, fullName: string, targetType?: ClassType, target?: any) =>  relfect.class.hasMetadata(metadata.annotation, (!method || method === 'constructor') ? 'class' : 'method', method));
            expresses.push('&&')
        }
        if (isString(metadata.pointcut)) {
            let pointcuts = (metadata.pointcut || '').trim();
            expresses.push(this.tranlateExpress(relfect, pointcuts));
        } else if (isRegExp(metadata.pointcut)) {
            let pointcutReg = metadata.pointcut;
            if (annPreChkExp.test(pointcutReg.source)) {
                expresses.push((name: string, fullName: string, targetType?: Type) => {
                    return relfect.class.decors.some(n => pointcutReg.test(n.decor));
                });
            } else {
                expresses.push((name: string, fullName: string) => pointcutReg.test(fullName));
            }
        }
        return this.mergeExpress(expresses);
    }

    protected spiltBrace(strExp: string) {
        strExp = strExp.trim();

        if (preParam.test(strExp) && endParam.test(strExp)) {
            strExp = strExp.substring(1, strExp.length - 1).trim();
        }

        if (preParam.test(strExp) && endParam.test(strExp)) {
            return this.spiltBrace(strExp);
        } else {
            return strExp;
        }
    }

    protected expressToFunc(reflect: AopReflect, strExp: string): MatchExpress {
        if (annContentExp.test(strExp)) {
            let exp = strExp.substring(12, strExp.length - 1);
            let annotation = aExp.test(exp) ? exp : ('@' + exp);
            return (name: string, fullName: string) => reflect.class.hasMetadata(annotation, (!name || name === 'constructor') ? 'class' : 'method', name);
        } else if (execContentExp.test(strExp)) {
            let exp = strExp.substring(10, strExp.length - 1);
            if (exp === '*' || exp === '*.*') {
                return (name: string, fullName: string) => !!name && !reflect.aspect;
            } else if (mthNameExp.test(exp)) {
                // if is method name, will match aspect self only.
                return fasleFn;
            } else if (tgMthChkExp.test(exp)) {
                exp = exp.replace(replAny, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                    .replace(replAny1, '\\\w+')
                    .replace(replDot, '\\\.')
                    .replace(replNav, '\\\/');

                let matcher = new RegExp(exp + '$');
                return (name: string, fullName: string) => matcher.test(fullName);
            } else {
                return fasleFn;
            }
        } else if (withInChkExp.test(strExp)) {
            let classnames = strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1).split(',').map(n => n.trim());
            return (name: string, fullName: string, targetType?: Type) => classnames.indexOf(lang.getClassName(targetType)) >= 0;
        } else if (targetChkExp.test(strExp)) {
            let torken = strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1).trim();
            return (name: string, fullName: string, targetType?: Type) => this.container.state().getInjector(reflect.type).getTokenProvider(torken) === targetType;
        } else {
            return fasleFn;
        }
    }

    protected tranlateExpress(reflect: AopReflect, strExp: string): MatchExpress {
        let expresses: ((MatchExpress) | string)[] = [];

        let idxOr = strExp.indexOf('||');
        let idxAd = strExp.indexOf('&&');
        if (idxAd < 0 && idxOr < 0) {
            expresses.push(this.expressToFunc(reflect, this.spiltBrace(strExp)))
        } else {
            if (idxOr > idxAd) {
                let leftExp = this.spiltBrace(strExp.substring(0, idxOr));
                if (leftExp) {
                    expresses.push(this.tranlateExpress(reflect, leftExp));
                }
                let rightExp = this.spiltBrace(strExp.substring(idxOr + 2));
                if (rightExp) {
                    expresses.push('||');
                    expresses.push(this.tranlateExpress(reflect, rightExp));
                }
            } else if (idxAd > idxOr) {
                let leftExp = this.spiltBrace(strExp.substring(0, idxAd));
                if (leftExp) {
                    expresses.push(this.tranlateExpress(reflect, leftExp));
                }
                let rightExp = this.spiltBrace(strExp.substring(idxAd + 2));
                if (rightExp) {
                    expresses.push('&&');
                    expresses.push(this.tranlateExpress(reflect, rightExp));
                }
            }
        }

        return this.mergeExpress(expresses);
    }


    protected mergeExpress(expresses: (MatchExpress | string)[]): MatchExpress {
        return (method: string, fullName: string, targetType?: Type, pointcut?: IPointcut) => {
            let flag;
            expresses.forEach((express, idx) => {
                if (!isNil(flag)) {
                    return;
                }
                if (isFunction(express)) {
                    let rel = express(method, fullName, targetType, pointcut);
                    if (idx < expresses.length - 2) {
                        if (!rel && express[idx + 1] === '&&') {
                            flag = false;
                        }
                        if (rel && express[idx + 1] === '||') {
                            flag = true;
                        }
                    } else {
                        flag = rel;
                    }
                }

            });
            return flag;
        }
    }
}

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