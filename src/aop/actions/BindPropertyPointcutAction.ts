
// import { DecoratorType, ActionData, ActionComposite, getMethodMetadata } from '../../core/index';
// import { IContainer } from '../../IContainer';
// import { IAspectManager } from '../AspectManager';
// import { isClass, symbols, isFunction } from '../../utils/index';
// import { AopActions } from './AopActions';
// import { Aspect, Advice } from '../decorators/index';
// import { AdviceMetadata } from '../metadatas/index';
// import { IAdviceMatcher } from '../IAdviceMatcher';
// import { IMethodAccessor } from '../../IMethodAccessor';
// import { isValideAspectTarget } from '../isValideAspectTarget';
// import { IPointcut } from '../IPointcut';
// import { NonePointcut } from '../../core/index';


// export interface BindPropertyPointcutActionData extends ActionData<AdviceMetadata> {
// }

// @NonePointcut()
// export class BindPropertyPointcutAction extends ActionComposite {

//     constructor() {
//         super(AopActions.bindPropertyPointcut);
//     }

//     protected working(container: IContainer, data: BindPropertyPointcutActionData) {
//         // aspect class do nothing.
//         if (!data.target || !isValideAspectTarget(data.targetType)) {
//             return;
//         }
//         let aspects = container.get<IAspectManager>(symbols.IAspectManager);
//         let access = container.get<IMethodAccessor>(symbols.IMethodAccessor);

//         let className = data.targetType.name;
//         let properties: IPointcut[] = [];

//         let target = data.target;
//         Object.getOwnPropertyNames(target).forEach(name => {
//             properties.push({
//                 name: name,
//                 fullName: `${className}.${name}`
//             });
//         });

//         properties.forEach(pointcut => {
//             let fullName = pointcut.fullName;
//             let propertyName = pointcut.name;
//             let advices = aspects.getAdvices(fullName);
//             if (advices) {
//                 var descriptor = Object.getOwnPropertyDescriptor(target, propertyName);
//                 Object.defineProperty(target, propertyName, {
//                     get() {
//                         return this.value;
//                     },
//                     enumerable: true,
//                     configurable: true
//                 });
//                 if (descriptor.writable) {
//                     Object.defineProperty(target, propertyName, {
//                         set(value) {
//                             this.value = value;
//                         }
//                     });
//                 }
//             }
//         });
//     }
// }
