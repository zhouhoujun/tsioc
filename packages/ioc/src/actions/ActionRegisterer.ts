import { Type } from '../types';
import { IocAction, IocActionType } from './Action';
import { IIocContainer } from '../IIocContainer';
import { isClass } from '../utils';
import { IocCompositeAction } from './IocCompositeAction';
import { IocCoreService } from '../services';

/**
 * action registerer.
 *
 * @export
 * @class ActionRegisterer
 */
export class ActionRegisterer extends IocCoreService {
    private maps: Map<Type<IocAction<any>>, IocAction<any>>;

    constructor() {
        super()
        this.maps = new Map();
    }

    get<T extends IocAction<any>>(type: Type<T>): T {
        if (this.maps.has(type)) {
            return this.maps.get(type) as T;
        }
        return null;
    }

    register(container: IIocContainer, action: IocActionType, setup?: boolean): this {
        if (!isClass(action)) {
            return this;
        }
        if (this.maps.has(action)) {
            return this;
        }
        let actionInstance = new action(container);
        this.maps.set(action, actionInstance);
        if (setup) {
            if (actionInstance instanceof IocCompositeAction) {
                actionInstance.setup();
            }
        }
        return this;
    }
}
