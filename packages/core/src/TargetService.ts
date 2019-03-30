import { lang, Token, isToken } from '@tsdi/ioc';


/**
 * target reference.
 *
 * @export
 * @class TargetRef
 */
export class TargetService {
    private targetType: Token<any>;
    constructor(protected target: any) {

    }

    /**
     * get type.
     *
     * @returns {ClassType<any>}
     * @memberof TargetRef
     */
    getToken(): Token<any> {
        if (!this.targetType) {
            this.targetType = isToken(this.target) ? this.target : lang.getClass(this.target);
        }
        return this.targetType;
    }

    clone(target?: any) {
        let ClassSer = lang.getClass(this);
        return new ClassSer(target || this.target);
    }
}

/**
 * target ref.
 */
export type TargetRef = Token<any> | TargetService;

/**
 * target refs.
 */
export type TargetRefs = TargetRef | TargetRef[];

/**
 * target reference service.
 *
 * @export
 * @class TargetRefService
 * @extends {TargetService}
 */
export class TargetRefService extends TargetService {

    static create(target: any): TargetRefService {
        return new TargetRefService(target);
    }
}


/**
 * target private service.
 *
 * @export
 * @class TargetPrivateRef
 * @extends {TargetService}
 */
export class TargetPrivateService extends TargetService {
    /**
     * crete target private.
     *
     * @static
     * @param {*} target
     * @returns {TargetPrivateService}
     * @memberof TargetPrivateService
     */
    static create(target: any): TargetPrivateService {
        return new TargetPrivateService(target);
    }
}

