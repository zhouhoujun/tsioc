import { IAdviceMatcher } from './IAdviceMatcher';
import { AdviceMetadata } from './metadatas/index';
import { DecoratorType, NonePointcut } from '../core/index';
import { Type } from '../Type';
import { symbols, isString, isRegExp } from '../utils/index';
import { IPointcut } from './IPointcut';
import { ObjectMap } from '../types';
import { MatchPointcut } from './MatchPointcut';
import { hasMethodMetadata } from '../browser';

@NonePointcut()
export class AdviceMatcher implements IAdviceMatcher {

    constructor() {

    }

    match(adviceMaps: ObjectMap<AdviceMetadata[]>, type: Type<any>, instance?: any): MatchPointcut[] {

        let className = type.name;
        let points: IPointcut[] = [];

        // match method.
        for (let name in Object.getOwnPropertyDescriptors(type.prototype)) {
            points.push({
                name: name,
                fullName: `${className}.${name}`
            });
        }


        // match property
        Object.getOwnPropertyNames(instance || type.prototype).forEach(name => {
            points.push({
                name: name,
                fullName: `${className}.${name}`
            });
        });

        let matched: MatchPointcut[] = [];
        Object.keys(adviceMaps).forEach(name => {
            let advices = adviceMaps[name];
            advices.forEach(metadata => {
                matched.push(...this.filterPointcut(type, points, metadata));
            });
        });

        return matched;

    }

    filterPointcut(type: Type<any>, points: IPointcut[], metadata: AdviceMetadata): MatchPointcut[] {
        if (!metadata.pointcut) {
            return [];
        }
        let matchedPointcut = [];
        if (metadata.pointcut) {
            if (isString(metadata.pointcut)) {
                let pointcut = metadata.pointcut;
                pointcut = (pointcut || '').trim();
                if (/^execution\(\S+\)$/.test(pointcut)) {
                    pointcut = pointcut.substring(10, pointcut.length - 1);
                }

                matchedPointcut = points.filter(a => {
                    if (!a.name) {
                        return false;
                    }
                    if (pointcut === '*') {
                        return true;
                    }
                    if (pointcut === '*.*') {
                        return true;
                    }
                    pointcut = pointcut.replace(/\*\*/gi, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                        .replace(/\*/gi, '\\\w+')
                        .replace(/\./gi, '\\\.')
                        .replace(/\//gi, '\\\/');
                    let matcher = new RegExp(pointcut + '$');
                    return matcher.test(a.fullName);
                });
            } else if (isRegExp(metadata.pointcut)) {
                let pointcut = metadata.pointcut;
                matchedPointcut = points.filter(m => m.fullName && pointcut.test(m.fullName))
                    .map(p => {
                        return Object.assign({}, p, { advice: metadata });
                    });
            }
        }

        if (metadata.annotation) {
            let annotation = metadata.annotation.trim();
            if (/^@annotation\(\S+\)$/.test(annotation)) {
                annotation = annotation.substring(11, annotation.length - 1)
                matchedPointcut = points.filter(a => {
                    return hasMethodMetadata('@' + annotation, type, a.name)
                })
            }
        }

        matchedPointcut = matchedPointcut || [];
        return matchedPointcut.map(p => {
            return Object.assign({}, p, { advice: metadata });
        });
    }

}
