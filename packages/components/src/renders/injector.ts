import { Class, CtorType, DestroyCallback, InjectFlags, Injector, InjectorScope, InvocationContext, InvokeOptions, MethodType, Modules, Platform, ProviderType, RegisterOption, StaticInjector, Token, Type, TypeDef, TypeOption } from '@tsdi/ioc';
import { TContainerNode, TDirectiveHostNode, TElementContainerNode, TElementNode } from '../interfaces/node';
import { FLAGS, INJECTOR, LView, LViewFlags, TView } from '../interfaces/view';
import { DirectiveDef } from '../type';
import { assertEqual } from '../util/assert';
import { stringifyForError } from '../util/stringify';


export class NodeInjector extends StaticInjector {

    constructor(
        private _tNode: TDirectiveHostNode | null,
        private _lView: LView) {
        super([], _lView[INJECTOR] || undefined);

    }
}


// /**
//  * Retrieve or instantiate the injectable from the `LView` at particular `index`.
//  *
//  * This function checks to see if the value has already been instantiated and if so returns the
//  * cached `injectable`. Otherwise if it detects that the value is still a factory it
//  * instantiates the `injectable` and caches the value.
//  */
// export function getNodeInjectable(
//     lView: LView, tView: TView, index: number, tNode: TDirectiveHostNode): any {
//     let value = lView[index];
//     const tData = tView.data;
//     if (isFactory(value)) {
//         const factory: NodeInjectorFactory = value;
//         if (factory.resolving) {
//             throwCyclicDependencyError(stringifyForError(tData[index]));
//         }
//         const previousIncludeViewProviders = setIncludeViewProviders(factory.canSeeViewProviders);
//         factory.resolving = true;
//         const previousInjectImplementation =
//             factory.injectImpl ? setInjectImplementation(factory.injectImpl) : null;
//         const success = enterDI(lView, tNode, InjectFlags.Default);
//         devMode &&
//             assertEqual(
//                 success, true,
//                 'Because flags do not contain \`SkipSelf\' we expect this to always succeed.');
//         try {
//             value = lView[index] = factory.factory(undefined, tData, lView, tNode);
//             // This code path is hit for both directives and providers.
//             // For perf reasons, we want to avoid searching for hooks on providers.
//             // It does no harm to try (the hooks just won't exist), but the extra
//             // checks are unnecessary and this is a hot path. So we check to see
//             // if the index of the dependency is in the directive range for this
//             // tNode. If it's not, we know it's a provider and skip hook registration.
//             if (tView.firstCreatePass && index >= tNode.directiveStart) {
//                 devMode && assertDirectiveDef(tData[index]);
//                 registerPreOrderHooks(index, tData[index] as DirectiveDef<any>, tView);
//             }
//         } finally {
//             previousInjectImplementation !== null &&
//                 setInjectImplementation(previousInjectImplementation);
//             setIncludeViewProviders(previousIncludeViewProviders);
//             factory.resolving = false;
//             leaveDI();
//         }
//     }
//     return value;
// }
