
import { DecoratorType, ActionData, ActionComposite, getMethodMetadata } from '../../core';
import { IContainer } from '../../IContainer';
import { AspectSet } from '../AspectSet';
import { isClass, symbols, isFunction } from '../../utils';
import { AopActions } from './AopActions';
import { Aspect, Advice } from '../decorators';
import { AdviceMetadata } from '../metadatas';
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IMethodAccessor } from '../../IMethodAccessor';
import { isValideAspectTarget } from '../isValideAspectTarget';
import { IPointcut } from '../IPointcut';


export interface BindPropertyPointcutActionData extends ActionData<AdviceMetadata> {
}

export class BindPropertyPointcutAction extends ActionComposite {

    constructor() {
        super(AopActions.bindPropertyPointcut);
    }

    protected working(container: IContainer, data: BindPropertyPointcutActionData) {
        // aspect class do nothing.
        if (!data.target || !isValideAspectTarget(data.targetType)) {
            return;
        }
        let aspects = container.get(AspectSet);
        let access = container.get<IMethodAccessor>(symbols.IMethodAccessor);

        let className = data.targetType.name;
        let properties: IPointcut[] = [];

        let target = data.target;
        Object.getOwnPropertyNames(target).forEach(name => {
            properties.push({
                name: name,
                fullName: `${className}.${name}`
            });
        });

        properties.forEach(pointcut => {
            let fullName = pointcut.fullName;
            let propertyName = pointcut.name;
            let advices = aspects.getAdvices(fullName);
            if (advices) {
                var descriptor = Object.getOwnPropertyDescriptor(target, propertyName);
                Object.defineProperty(target, propertyName, {
                    get() {
                        return this.value;
                    },
                    enumerable: true,
                    configurable: true
                });
                if (descriptor.writable) {
                    Object.defineProperty(target, propertyName, {
                        set(value) {
                            this.value = value;
                        }
                    });
                }
            }
        });
    }
}
