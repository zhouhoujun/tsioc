import { RegisterActionContext, RegisterActionOption } from '../RegisterActionContext';
import { IIocContainer } from '../../IIocContainer';

/**
 * design action option.
 *
 * @export
 * @interface DesignActionOption
 * @extends {RegisterActionOption}
 */
export interface DesignActionOption extends RegisterActionOption {

}

/**
 * design action context.
 *
 * @export
 * @class DesignActionContext
 * @extends {RegisterActionContext}
 */
export class DesignActionContext extends RegisterActionContext {

    /**
     * parse design action context.
     *
     * @static
     * @param {DesignActionOption} options
     * @param {(IIocContainer | (() => IIocContainer))} [raiseContainer]
     * @returns {DesignActionContext}
     * @memberof DesignActionContext
     */
    static parse(options: DesignActionOption, raiseContainer?: IIocContainer | (() => IIocContainer)): DesignActionContext {
        let ctx = new DesignActionContext(options.targetType, raiseContainer);
        ctx.setOptions(options);
        return ctx;
    }

    isClassCompleted() {
        if (this.targetReflect) {
            return !Object.values(this.targetReflect.classDecors).some(inj => !inj);
        }
        return false;
    }

    isPropertyCompleted() {
        if (this.targetReflect) {
            return !Object.values(this.targetReflect.propsDecors).some(inj => !inj);
        }
        return false;
    }

    isMethodCompleted() {
        if (this.targetReflect) {
            return !Object.values(this.targetReflect.methodDecors).some(inj => !inj);
        }
        return false;
    }
}
