import { IAdviceMatcher } from './IAdviceMatcher';
import { AdviceMetadata } from './metadatas';
import { DecoratorType, Singleton } from '../core';
import { Type } from '../Type';
import { isString, isRegExp } from 'util';
import { symbols } from '../utils';
import { Pointcut } from './Pointcut';
import { ObjectMap } from '../types';
import { MatchPointcut } from './MatchPointcut';


@Singleton(symbols.IAdviceMatcher)
export class AdviceMatcher implements IAdviceMatcher {

    constructor() {

    }

    match(adviceMaps: ObjectMap<AdviceMetadata[]>, type: Type<any>, instance?: any): MatchPointcut[] {

        let className = type.name;
        let points = instance ? Object.keys(instance).map(n => {
            return {
                name: n,
                fullName: `${className}.${n}`
            } as Pointcut;
        }) : [
                <Pointcut>{
                    name: 'constructor',
                    fullName: `${className}.constructor`
                }
            ];

        let matched: MatchPointcut[] = [];
        for (let name in adviceMaps) {
            let advices = adviceMaps[name];
            advices.forEach(metadata => {
                matched = matched.concat(this.filterPointcut(points, metadata));
            });
        }

        return matched;

    }

    filterPointcut(points: Pointcut[], metadata: AdviceMetadata): MatchPointcut[] {
        if (!metadata.pointcut) {
            return [];
        }

        if (isString(metadata.pointcut)) {
            let pointcut = metadata.pointcut;
            pointcut = (pointcut || '').trim();
            return points.filter(a => {
                if (!/^execution\(\S+\)$/.test(pointcut)) {
                    return false;
                }
                let execution = pointcut.substring(10, pointcut.length - 1);
                if (execution === '*') {
                    return true;
                }

                // TODO: match
                return false;
            }).map(p => {
                let m = p as MatchPointcut;
                m.advice = metadata;
                return m;
            });
        } else if (isRegExp(metadata.pointcut)) {
            let pointcut = metadata.pointcut;
            return points.filter(m => pointcut.test(m.fullName))
                .map(p => {
                    let m = p as MatchPointcut;
                    m.advice = metadata;
                    return m;
                });
        }

        return [];
    }

}
