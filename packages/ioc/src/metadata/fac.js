"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Abstract = void 0;
exports.createDecorator = createDecorator;
exports.createParamDecorator = createParamDecorator;
exports.createPropDecorator = createPropDecorator;
require("reflect-metadata");
const dispatch_1 = require("./dispatch");
const define_1 = require("./define");
const chk_1 = require("../utils/chk");
const tokens_1 = require("../tokens");
const obj_1 = require("../utils/obj");
const exception_1 = require("../exception");
const compose_1 = require("../handlers/compose");
/**
 * create dectorator for class params props methods.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {ArgsIteratorAction[]} [actions]  metadata iterator actions.
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {*} decorator.
 */
function createDecorator(name, option) {
    const decor = `@${name}`;
    const factory = (...args) => {
        let metadata;
        if (args.length) {
            if (args.length === 1 && (option.isMatadata ? option.isMatadata(args[0]) : (0, obj_1.isMetadataObject)(args[0]))) {
                metadata = args[0];
            }
            else if (option.props) {
                metadata = option.props(...args);
            }
        }
        return (...pms) => {
            return storeMetadata(factory, pms, metadata, option);
        };
    };
    if (option.def)
        factory.getHandler = mapToFac(option.def);
    if (option.design)
        factory.getDesignHandler = mapToFac(option.design);
    if (option.runtime)
        factory.getRuntimeHandler = mapToFac(option.runtime);
    factory.toString = () => decor;
    factory.decorator = decor;
    return factory;
}
function mapToFac(maps) {
    const mapHd = {};
    for (const type in maps) {
        const handle = maps[type];
        if (!handle)
            continue;
        mapHd[type] = (0, chk_1.isArray)(handle) ? (0, compose_1.composeHandlers)(handle) : handle;
    }
    return (type) => mapHd[type];
}
function storeMetadata(decor, args, metadata, option) {
    let target, propertyKey;
    if (!metadata) {
        metadata = {};
    }
    if (option.appendProps) {
        option.appendProps(metadata);
    }
    switch (args.length) {
        case 1:
            target = args[0];
            if (target) {
                (0, dispatch_1.dispatchTypeDecor)(target, (0, define_1.toDefine)(decor, metadata, define_1.Decors.CLASS, option), option);
                return target;
            }
            break;
        case 2:
            target = args[0];
            propertyKey = args[1];
            (0, dispatch_1.dispatchPropertyDecor)(target, (0, define_1.toDefine)(decor, metadata, define_1.Decors.property, option, propertyKey), option);
            break;
        case 3:
            if ((0, chk_1.isNumber)(args[2])) {
                target = args[0];
                propertyKey = args[1];
                const parameterIndex = args[2];
                (0, dispatch_1.dispatchParamDecor)(target, (0, define_1.toDefine)(decor, metadata, define_1.Decors.parameter, option, propertyKey, parameterIndex), option);
            }
            else if ((0, chk_1.isUndefined)(args[2])) {
                target = args[0];
                propertyKey = args[1];
                (0, dispatch_1.dispatchPropertyDecor)(target, (0, define_1.toDefine)(decor, metadata, define_1.Decors.property, option, propertyKey), option);
            }
            else {
                target = args[0];
                propertyKey = args[1];
                const descriptor = args[2];
                if (!descriptor) {
                    return;
                }
                // is set get or not.
                if (descriptor.set || descriptor.get) {
                    (0, dispatch_1.dispatchPropertyDecor)(target, (0, define_1.toDefine)(decor, metadata, define_1.Decors.property, option, propertyKey), option);
                }
                else {
                    (0, dispatch_1.dispatchMethodDecor)(target, (0, define_1.toDefine)(decor, metadata, define_1.Decors.method, option, propertyKey), option);
                }
                return descriptor;
            }
            break;
        default:
            throw new exception_1.Exception(`Invalid @${decor.toString()} Decorator declaration.`);
    }
}
/**
 * create parameter decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {DecoratorOption<T>} [options] decorator options.
 * @returns
 */
function createParamDecorator(name, options) {
    return createDecorator(name, {
        props: (provider, alias) => {
            if (alias) {
                return (0, chk_1.isString)(alias) ? { provider: (0, tokens_1.getToken)(provider, alias) } : { provider: (0, tokens_1.getToken)(provider, alias.alias), ...alias, alias: undefined };
            }
            else {
                return { provider };
            }
        },
        ...options
    });
}
/**
 * create property decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {DecoratorOption<T>} [options] decorator options.
 * @returns
 */
function createPropDecorator(name, options) {
    return createDecorator(name, {
        props: (provider, alias) => ({ provider, alias }),
        ...options
    });
}
/**
 * Abstract decorator. define for class.
 *
 * @Abstract
 */
exports.Abstract = createDecorator('Abstract', {
    actionType: define_1.ActionType.annoation,
    appendProps: (meta) => {
        meta.abstract = true;
    }
});
//# sourceMappingURL=fac.js.map