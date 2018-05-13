import { IAdviceMatcher } from './IAdviceMatcher';
import { AdviceMetadata } from './metadatas/index';
import {
    Inject, MethodMetadata, getParamerterNames, getOwnMethodMetadata,
    hasOwnMethodMetadata, hasOwnClassMetadata, Singleton,
    IContainer, symbols, isString, isRegExp, isUndefined, Type, ObjectMap, Express3, getClassName, lang
} from '@ts-ioc/core';
import { IPointcut, MatchPointcut } from './joinpoints/index';
import { Advices, Advicer } from './advices/index';
import { Aspect, Advice, NonePointcut } from './decorators/index';
import { IAdvisor } from './IAdvisor';
import { AopSymbols } from './symbols';

/**
 * advice matcher, use to match advice when a registered create instance.
 *
 * @export
 * @class AdviceMatcher
 * @implements {IAdviceMatcher}
 */
@NonePointcut()
@Singleton(AopSymbols.IAdviceMatcher)
export class AdviceMatcher implements IAdviceMatcher {

    constructor(@Inject(symbols.IContainer) private container: IContainer) {

    }

    match(aspectType: Type<any>, targetType: Type<any>, adviceMetas?: ObjectMap<AdviceMetadata[]>, instance?: any): MatchPointcut[] {

        let className =  getClassName(targetType);

        adviceMetas = adviceMetas || getOwnMethodMetadata<AdviceMetadata>(Advice, targetType);
        let advisor = this.container.get<IAdvisor>(AopSymbols.IAdvisor);
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
            lang.forIn(allmethods, (item, name:string) => {
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
                    return pointcut === name;
                }
            } else if (isRegExp(pointcut)) {
                return pointcut.test(name);
            }
        }
        return false;
    }

    filterPointcut(type: Type<any>, points: IPointcut[], metadata: AdviceMetadata): MatchPointcut[] {
        if (!metadata.pointcut) {
            return [];
        }
        let matchedPointcut;
        if (metadata.pointcut) {
            let match = this.matchTypeFactory(type, metadata.pointcut);
            matchedPointcut = points.filter(p => match(p.name, p.fullName, p))
        }

        matchedPointcut = matchedPointcut || [];
        return matchedPointcut.map(p => {
            return lang.assign({}, p, { advice: metadata });
        });
    }


    protected matchTypeFactory(type: Type<any>, pointcut: string | RegExp): Express3<string, string, IPointcut, boolean> {
        if (isString(pointcut)) {
            pointcut = (pointcut || '').trim();
            if (/^@annotation\(\S+\)$/.test(pointcut)) {
                pointcut = pointcut.substring(12, pointcut.length - 1);
                let annotation = /^@/.test(pointcut) ? pointcut : ('@' + pointcut);
                return (name: string, fullName: string) => hasOwnMethodMetadata(annotation, type, name) && !hasOwnClassMetadata(Aspect, type);

            } else {
                if (/^execution\(\S+\)$/.test(pointcut)) {
                    pointcut = pointcut.substring(10, pointcut.length - 1);
                }

                if (pointcut === '*' || pointcut === '*.*') {
                    return (name: string, fullName: string, pointcut: IPointcut) => !!name && !hasOwnClassMetadata(Aspect, type);
                }

                pointcut = pointcut.replace(/\*\*/gi, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                    .replace(/\*/gi, '\\\w+')
                    .replace(/\./gi, '\\\.')
                    .replace(/\//gi, '\\\/');

                let matcher = new RegExp(pointcut + '$');

                return (name: string, fullName: string, pointcut: IPointcut) => matcher.test(fullName);
            }
        } else if (isRegExp(pointcut)) {
            let pointcutReg = pointcut;
            if (/^\^?@\w+/.test(pointcutReg.source)) {
                return (name: string, fullName: string, pointcut: IPointcut) => {
                    let decName = Reflect.getMetadataKeys(type, name);
                    return decName.some(n => isString(n) && pointcutReg.test(n));
                }

            } else {
                return (name: string, fullName: string, pointcut: IPointcut) => pointcutReg.test(fullName);
            }
        }
        return null;
    }

}
