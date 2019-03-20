import { ITypeDecorator, ClassMetadata, createClassDecorator,  TypeMetadata, isNumber, ArgsIterator } from '@ts-ioc/ioc';
import { RegScope } from '../modules/RegScope';


/**
 * register for metadata.
 *
 * @export
 * @interface RegisterForMetadata
 * @extends {TypeMetadata}
 */
export interface RegisterForMetadata extends TypeMetadata {
    /**
     * the way to register the module. default as child module.
     *
     * @type {boolean}
     * @memberof ModuleConfig
     */
    regScope?: RegScope;
}

/**
 * RegisterFor decorator.
 *
 * @export
 * @interface IRootOnlyDecorator
 * @extends {ITypeDecorator<ClassMetadata>}
 */
export interface IRegisterForDecorator extends ITypeDecorator<RegisterForMetadata> {


    /**
     * RegisterFor decorator, for class. use to define the the way to register the module. default as child module.
     *
     * @RegisterFor
     *
     * @param {RegScope} moduleScope register module scope.
     */
    (moduleScope: RegScope): ClassDecorator;

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
export const RegisterFor: IRegisterForDecorator = createClassDecorator<RegisterForMetadata>('RegisterFor', (args: ArgsIterator) => {
    args.next<RegisterForMetadata>({
        match: (arg) => isNumber(arg),
        setMetadata: (metadata, arg) => {
            metadata.regScope = arg;
        }
    });
}) as IRegisterForDecorator;

