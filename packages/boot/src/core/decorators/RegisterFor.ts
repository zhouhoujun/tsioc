import { ITypeDecorator, ClassMetadata, createClassDecorator,  TypeMetadata, isNumber, ArgsIterator } from '@ts-ioc/ioc';
import { ModuleScope } from '../modules/ModuleConfigure';


export interface RegisterForMetadata extends TypeMetadata {
    /**
     * the way to register the module. default as child module.
     *
     * @type {boolean}
     * @memberof ModuleConfig
     */
    regScope?: ModuleScope;
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
     * @param {ModuleScope} moduleScope register module scope.
     */
    (moduleScope: ModuleScope): ClassDecorator;

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

