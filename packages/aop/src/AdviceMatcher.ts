import {
    Inject, isString, isRegExp, isDefined, Type, ObjectMap, lang, isArray,
    isFunction, TypeReflectsToken, ITypeReflects
} from '@tsdi/ioc';
import { IAdviceMatcher } from './IAdviceMatcher';
import { AdviceMetadata, AspectMetadata } from './metadatas';
import { IPointcut } from './joinpoints/IPointcut';
import { MatchPointcut } from './joinpoints/MatchPointcut';
import { Advice, Aspect } from './decorators';
import {
    annPreChkExp, executionChkExp, preParam, endParam, annContentExp, aExp, execContentExp,
    mthNameExp, tgMthChkExp, replAny, replAny1, replDot, replNav, withInChkExp, targetChkExp
} from './regexps';

/**
 * match express.
 */
export type MatchExpress = (method: string, fullName: string, targetType?: Type, target?: any, pointcut?: IPointcut) => boolean;



/**
 * advice matcher, use to match advice when a registered create instance.
 *
 * @export
 * @class AdviceMatcher
 * @implements {IAdviceMatcher}
 */
export class AdviceMatcher implements IAdviceMatcher {

    constructor(@Inject(TypeReflectsToken) private reflects: ITypeReflects) {

    }

    match(aspectType: Type, targetType: Type, adviceMetas?: ObjectMap<AdviceMetadata[]>, target?: any): MatchPointcut[] {
        let refs = this.reflects;
        let aspectMeta = lang.first(refs.getMetadata<AspectMetadata>(Aspect, aspectType));
        if (aspectMeta) {
            if (aspectMeta.without) {
                let outs = isArray(aspectMeta.without) ? aspectMeta.without : [aspectMeta.without];
                if (outs.some(t => refs.isExtends(targetType, t))) {
                    return [];
                }
            }
            if (aspectMeta.within) {
                let ins = isArray(aspectMeta.within) ? aspectMeta.within : [aspectMeta.within];
                if (!ins.some(t => refs.isExtends(targetType, t))) {
                    if (!aspectMeta.annotation) {
                        return [];
                    }
                }
            }
            if (aspectMeta.annotation) {
                let annotation = isFunction(aspectMeta.annotation) ? aspectMeta.annotation.toString() : aspectMeta.annotation;
                let anno = (annPreChkExp.test(annotation) ? '' : '@') + annotation;
                if (!refs.hasMetadata(anno, targetType)) {
                    return [];
                }
            }
        }

        let className = lang.getClassName(targetType);
        adviceMetas = adviceMetas || refs.getMethodMetadata<AdviceMetadata>(Advice, targetType);
        let matched: MatchPointcut[] = [];

        if (targetType === aspectType) {
            let adviceNames = Object.keys(adviceMetas);
            if (adviceNames.length > 1) {
                let advices: AdviceMetadata[] = [];
                adviceNames.forEach(n => {
                    advices = advices.concat(adviceMetas[n]);
                });

                adviceNames.forEach(n => {
                    advices.forEach(adv => {
                        if (adv.propertyKey !== n) {
                            if (this.matchAspectSelf(n, adv)) {
                                matched.push({
                                    name: n,
                                    fullName: `${className}.${n}`,
                                    advice: adv
                                });
                            }
                        }
                    })
                });
            }
        } else {
            let points: IPointcut[] = [];
            let decorators = refs.create(targetType).defines.getPropertyDescriptors();
            // match method.
            for (let name in decorators) {
                // if (name !== 'constructor') {
                    points.push({
                        name: name,
                        fullName: `${className}.${name}`
                    });
                // }
            }

            Object.getOwnPropertyNames(adviceMetas).forEach(name => {
                let advices = adviceMetas[name];
                advices.forEach(metadata => {
                    matched = matched.concat(this.filterPointcut(targetType, points, metadata));
                });
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

    filterPointcut(type: Type, points: IPointcut[], metadata: AdviceMetadata, target?: any): MatchPointcut[] {
        if (!metadata.pointcut) {
            return [];
        }
        let matchedPointcut;
        if (metadata.pointcut) {
            let match = this.matchTypeFactory(type, metadata);
            matchedPointcut = points.filter(p => match(p.name, p.fullName, type, target, p))
        }

        matchedPointcut = matchedPointcut || [];
        return matchedPointcut.map(p => {
            return Object.assign({}, p, { advice: metadata });
        });
    }

    protected matchTypeFactory(type: Type, metadata: AdviceMetadata): MatchExpress {
        let pointcut = metadata.pointcut;
        let expresses: (MatchExpress | string)[] = [];
        if (metadata.within) {
            expresses.push((method: string, fullName: string, targetType?: Type) => {
                if (isArray(metadata.within)) {
                    return metadata.within.some(t => this.reflects.isExtends(targetType, t));
                } else {
                    return this.reflects.isExtends(targetType, metadata.within);
                }
            });
            expresses.push('&&')
        }
        if (metadata.target) {
            expresses.push((method: string, fullName: string, targetType?: Type, target?: any) => {
                return metadata.target = target;
            });
            expresses.push('&&')
        }

        if (metadata.annotation) {
            expresses.push((method: string, fullName: string, targetType?: Type, target?: any) => {
                return this.reflects.hasMethodMetadata(metadata.annotation, targetType, method);
            });
            expresses.push('&&')
        }
        if (isString(pointcut)) {
            let pointcuts = (pointcut || '').trim();
            expresses.push(this.tranlateExpress(type, pointcuts));
        } else if (isRegExp(pointcut)) {
            let pointcutReg = pointcut;
            if (annPreChkExp.test(pointcutReg.source)) {
                expresses.push((name: string, fullName: string, targetType?: Type) => {
                    let decName = Reflect.getMetadataKeys(type, name);
                    return decName.some(n => isString(n) && pointcutReg.test(n));
                });

            } else {
                expresses.push((name: string, fullName: string) => pointcutReg.test(fullName));
            }
        }
        return this.mergeExpress(...expresses);
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

    protected expressToFunc(type: Type, strExp: string): MatchExpress {
        if (annContentExp.test(strExp)) {
            let exp = strExp.substring(12, strExp.length - 1);
            let annotation = aExp.test(exp) ? exp : ('@' + exp);
            return (name: string, fullName: string) => {
                if (name === 'constructor') {
                    return this.reflects.hasMetadata(annotation, type);
                }
                return this.reflects.hasMethodMetadata(annotation, type, name);
            }

        } else if (execContentExp.test(strExp)) {
            let exp = strExp.substring(10, strExp.length - 1);
            if (exp === '*' || exp === '*.*') {
                return (name: string, fullName: string) => !!name && !this.reflects.hasMetadata(Aspect, type);
            } else if (mthNameExp.test(exp)) {
                // if is method name, will match aspect self only.
                return () => false;
            } else if (tgMthChkExp.test(exp)) {
                exp = exp.replace(replAny, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                    .replace(replAny1, '\\\w+')
                    .replace(replDot, '\\\.')
                    .replace(replNav, '\\\/');

                let matcher = new RegExp(exp + '$');
                return (name: string, fullName: string) => matcher.test(fullName);
            } else {
                return () => false;
            }
        } else if (withInChkExp.test(strExp)) {
            let classnames = strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1).split(',').map(n => n.trim());
            return (name: string, fullName: string, targetType?: Type) => classnames.indexOf(lang.getClassName(targetType)) >= 0;
        } else if (targetChkExp.test(strExp)) {
            let torken = strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1).trim();
            return (name: string, fullName: string, targetType?: Type) => this.reflects.getInjector(type).getTokenProvider(torken) === targetType;
        } else {
            return () => false;
        }
    }

    protected tranlateExpress(type: Type, strExp: string): MatchExpress {
        let expresses: ((MatchExpress) | string)[] = [];

        let idxOr = strExp.indexOf('||');
        let idxAd = strExp.indexOf('&&');
        if (idxAd < 0 && idxOr < 0) {
            expresses.push(this.expressToFunc(type, this.spiltBrace(strExp)))
        } else {
            if (idxOr > idxAd) {
                let leftExp = this.spiltBrace(strExp.substring(0, idxOr));
                if (leftExp) {
                    expresses.push(this.tranlateExpress(type, leftExp));
                }
                let rightExp = this.spiltBrace(strExp.substring(idxOr + 2));
                if (rightExp) {
                    expresses.push('||');
                    expresses.push(this.tranlateExpress(type, rightExp));
                }
            } else if (idxAd > idxOr) {
                let leftExp = this.spiltBrace(strExp.substring(0, idxAd));
                if (leftExp) {
                    expresses.push(this.tranlateExpress(type, leftExp));
                }
                let rightExp = this.spiltBrace(strExp.substring(idxAd + 2));
                if (rightExp) {
                    expresses.push('&&');
                    expresses.push(this.tranlateExpress(type, rightExp));
                }
            }
        }

        return this.mergeExpress(...expresses);
    }


    protected mergeExpress(...expresses: (MatchExpress | string)[]): MatchExpress {
        return (method: string, fullName: string, targetType?: Type, pointcut?: IPointcut) => {
            let flag;
            expresses.forEach((express, idx) => {
                if (isDefined(flag)) {
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
