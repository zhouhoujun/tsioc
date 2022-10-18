import { InjectFlags, StaticInjector, Token, } from '@tsdi/ioc';
import { TContainerNode, TDirectiveHostNode, TElementContainerNode, TElementNode } from '../interfaces/node';
import { FLAGS, INJECTOR, LView, LViewFlags } from '../interfaces/view';


export class NodeInjector {

    constructor(
        private _tNode: TDirectiveHostNode | null,
        private _lView: LView) {
    }

    get<T>(token: Token<T>, notFoundValue?: any, flags?: InjectFlags): T {
        return getOrCreateInjectable(this._tNode, this._lView, token, flags, notFoundValue) as T;
    }

}
