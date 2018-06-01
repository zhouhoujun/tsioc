import { IAdviceMatcher, AdviceMatcherToken } from './IAdviceMatcher';
import { AdviceMetadata, AspectMetadata } from './metadatas/index';
import {
    Inject, MethodMetadata, getParamerterNames, getOwnMethodMetadata,
    hasOwnMethodMetadata, hasOwnClassMetadata, Singleton,
    IContainer, isString, isRegExp, isUndefined, Type, ObjectMap, Express3, getClassName, lang, ContainerToken, getOwnTypeMetadata, isArray, isClass, isFunction, getMethodMetadata
} from '@ts-ioc/core';
import { IPointcut, MatchPointcut } from './joinpoints/index';
import { Advices, Advicer } from './advices/index';
import { Aspect, Advice, NonePointcut } from './decorators/index';
import { IAdvisor, AdvisorToken } from './IAdvisor';

/**
 * advice matcher, use to match advice when a registered create instance.
 *
 * @export
 * @class AdviceMatcher
 * @implements {IAdviceMatcher}
 */
@NonePointcut()
@Singleton(AdviceMatcherToken)
export class AdviceMatcher implements IAdviceMatcher {

    constructor(@Inject(ContainerToken) private container: IContainer) {

    }

    match(aspectType: Type<any>, targetType: Type<any>, adviceMetas?: ObjectMap<AdviceMetadata[]>, target?: any): MatchPointcut[] {

        let aspectMeta = lang.first(getOwnTypeMetadata<AspectMetadata>(Aspect, aspectType));
        if (aspectMeta) {
            if (aspectMeta.within) {
                let ins = isArray(aspectMeta.within) ? aspectMeta.within : [aspectMeta.within];
                if (ins.indexOf(targetType) < 0) {
                    return [];
                }
            }
            if (aspectMeta.annotation) {
                let annotation = isFunction(aspectMeta.annotation) ? aspectMeta.annotation.toString() : aspectMeta.annotation;
                let anno = (/^\^?@\w+/.test(annotation) ? '' : '@') + annotation;
                if (!hasOwnClassMetadata(anno, targetType)) {
                    return [];
                }
            }
        }

        let className = getClassName(targetType);
        adviceMetas = adviceMetas || getOwnMethodMetadata<AdviceMetadata>(Advice, targetType);
        let advisor = this.container.get(AdvisorToken);
        let matched: MatchPointcut[] = [];

        if (targetType === aspectType) {
            let adviceNames = lang.keys(adviceMetas);
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
        } else { // if (!advisor.hasRegisterAdvices(targetType)) {
            let points: IPointcut[] = [];
            let decorators = Object.getOwnPropertyDescriptors(targetType.prototype);
            // match method.
            for (let name in decorators) {
                points.push({
                    name: name,
                    fullName: `${className}.${name}`
                });
            }

            let allmethods = getParamerterNames(targetType);
            lang.forIn(allmethods, (item, name: string) => {
                if (name === 'constructor') {
                    return;
                }
                if (isUndefined(decorators[name])) {
                    points.push({
                        name: name,
                        fullName: `${className}.${name}`
                    });
                }
            });

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
                if (/^execution\(\S+\)$/.test(pointcut)) {
                    pointcut = pointcut.substring(10, pointcut.length - 1);
                }
                return pointcut.startsWith(name);
            } else if (isRegExp(pointcut)) {
                return pointcut.test(name);
            }
        }
        return false;
    }

    filterPointcut(type: Type<any>, points: IPointcut[], metadata: AdviceMetadata, target?: any): MatchPointcut[] {
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
            return lang.assign({}, p, { advice: metadata });
        });
    }


    protected matchTypeFactory(type: Type<any>, metadata: AdviceMetadata): (method: string, fullName: string, targetType?: Type<any>, target?: any, pointcut?: IPointcut) => boolean {
        let pointcut = metadata.pointcut;
        if (isString(pointcut)) {
            let pointcuts = (pointcut || '').trim().split(/(&&)|(\|\|)/gi);
            let strExp = pointcut.substring(0);
            let expresses: (((method: string, fullName: string, targetType?: Type<any>, target?: any, pointcut?: IPointcut) => boolean) | string)[] = [];
            pointcuts.forEach(exp => {
                if (/^@annotation\(\s*\w+/.test(exp)) {
                    exp = exp.substring(12, exp.length - 1);
                    let annotation = /^@/.test(exp) ? exp : ('@' + exp);
                    expresses.push((name: string, fullName: string) => hasOwnMethodMetadata(annotation, type, name) && !hasOwnClassMetadata(Aspect, type));

                } else if (/^execution\(\s*\w+/.test(exp)) {
                    exp = exp.substring(10, exp.length - 1);
                    if (exp === '*' || exp === '*.*') {
                        expresses.push((name: string, fullName: string) => !!name && !hasOwnClassMetadata(Aspect, type));
                    } else if (/^\w+\(\s*\w+/.test(exp)) {
                        // if is method name, will match aspect self only.
                        expresses.push(() => false);
                    } else {
                        exp = exp.replace(/\*\*/gi, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                            .replace(/\*/gi, '\\\w+')
                            .replace(/\./gi, '\\\.')
                            .replace(/\//gi, '\\\/');

                        let matcher = new RegExp(exp + '$');

                        expresses.push((name: string, fullName: string) => matcher.test(fullName));
                    }
                } else if (/^@within\(\s*\w+/.test(exp)) {
                    let classnames = exp.substring(exp.indexOf('(') + 1, exp.length - 1).split(',').map(n => n.trim());
                    expresses.push((name: string, fullName: string, targetType?: Type<any>) => classnames.indexOf(getClassName(targetType)) >= 0);
                } else if (/^@target\(\s*\w+/.test(exp)) {
                    let torken = exp.substring(exp.indexOf('(') + 1, exp.length - 1).trim();
                    expresses.push((name: string, fullName: string, targetType?: Type<any>) => this.container.getTokenImpl(torken) === targetType);
                } else {
                    expresses.push(() => true);
                }
                strExp = strExp.substring(exp.length);
                if (strExp) {
                    if (/^(&&)|(\|\|)/.test(strExp)) {
                        expresses.push(strExp.substring(0, 2));
                        strExp = strExp.substring(2);
                    }
                }
            });
            if (metadata.within) {
                expresses.push('&&')
                expresses.push((method: string, fullName: string, targetType?: Type<any>) => {
                    if (isArray(metadata.within)) {
                        return metadata.within.indexOf(targetType) >= 0;
                    } else {
                        return metadata.within === targetType;
                    }
                });
            }
            if (metadata.target) {
                expresses.push('&&')
                expresses.push((method: string, fullName: string, targetType?: Type<any>, target?: any) => {
                    return metadata.target = target;
                });
            }

            if (metadata.annotation) {
                expresses.push('&&')
                expresses.push((method: string, fullName: string, targetType?: Type<any>, target?: any) => {
                    return hasOwnMethodMetadata(metadata.annotation, targetType, method);
                });
            }

            return (method: string, fullName: string, targetType?: Type<any>, pointcut?: IPointcut) => {
                let flag;
                expresses.forEach((express, idx) => {
                    if (!isUndefined(flag)) {
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
        } else if (isRegExp(pointcut)) {
            let pointcutReg = pointcut;
            if (/^\^?@\w+/.test(pointcutReg.source)) {
                return (name: string, fullName: string, targetType?: Type<any>) => {
                    let decName = Reflect.getMetadataKeys(type, name);
                    return decName.some(n => isString(n) && pointcutReg.test(n));
                }

            } else {
                return (name: string, fullName: string) => pointcutReg.test(fullName);
            }
        }
        return null;
    }

}
