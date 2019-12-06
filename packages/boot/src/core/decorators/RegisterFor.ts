import { ITypeDecorator, ClassMetadata, createClassDecorator, TypeMetadata, isNumber } from '@tsdi/ioc';
import { isString } from 'util';


/**
 * register for metadata.
 *
 * @export
 * @interface RegisterForMetadata
 * @extends {TypeMetadata}
 */
export interface RegisterForMetadata extends TypeMetadata {
    /**
     * set where this module to register. default as child module.
     *
     * @type {boolean}
     * @memberof ModuleConfig
     */
    regFor?: 'root';
}

/**
 * RegisterFor decorator.
 *
 * @export
 * @interface IRegisterForDecorator
 * @extends {ITypeDecorator<ClassMetadata>}
 */
export interface IRegisterForDecorator extends ITypeDecorator<RegisterForMetadata> {


    /**
     * RegisterFor decorator, for class. use to define the the way to register the module. default as child module.
     *
     * @RegisterFor
     *
     * @param {RegFor} regFor register module scope.
     */
    (regFor: 'root'): ClassDecorator;

    /**
     * RegisterFor decorator, for class. use to define the the way to register the module. default as child module.
     *
     * @RegisterFor
     *
     * @param {ClassMetadata} [metadata] metadata map.
     */
    (metadata?: ClassMetadata): ClassDecorator;
}

/**
 * RegisterFor decorator, for class. use to define the class as root module for root conatiner only.
 *
 * @RegisterFor
 */
export const RegisterFor: IRegisterForDecorator = createClassDecorator<RegisterForMetadata>('RegisterFor',
    [
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                if (arg === 'root') {
                    ctx.metadata.regFor = arg;
                }
                ctx.next(next);
            }
        }
    ]) as IRegisterForDecorator;

