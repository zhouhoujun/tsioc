"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Log = exports.InjectLog = void 0;
const ioc_1 = require("@tsdi/ioc");
const manager_1 = require("./manager");
const loggerResolvers = [
    (pr, next, ctx) => {
        if ((0, ioc_1.isNil)(pr.logname || pr.target)) {
            return next(pr, ctx);
        }
        const injector = ctx.getInjector();
        const targetType = pr.target;
        const targetName = targetType ? (0, ioc_1.getTypeName)(targetType) : '';
        const managers = injector.get(manager_1.LoggerManagers);
        if (!managers) {
            let local;
            if (pr.propertyKey && pr.paramName) {
                local = ` method ${pr.propertyKey?.toString()} param ${pr.paramName} of class `;
            }
            else if (pr.propertyKey) {
                local = ` field ${pr.propertyKey} of class `;
            }
            else {
                local = ' ';
            }
            throw new ioc_1.ArgumentException(`Autowired logger in${local}${targetName} failed. It denpendence on LoggerModule in package '@tsdi/logger',  please register LoggerModule first. `);
        }
        const adapter = pr.adapter;
        if (!managers.getLoggerManager(adapter)) {
            let local;
            if (pr.propertyKey && pr.paramName) {
                local = ` method ${pr.propertyKey?.toString()} param ${pr.paramName} of class `;
            }
            else if (pr.propertyKey) {
                local = ` field ${pr.propertyKey} of class `;
            }
            else {
                local = ' ';
            }
            throw new ioc_1.ArgumentException(`Autowired logger in${local}${targetName} failed. It denpendence on '${adapter}' adapter,  please register LogConfigure first. `);
        }
        const level = pr.level;
        const logger = managers.getLogger(pr.logname ?? (0, ioc_1.getTypeName)(pr.target ?? targetType), pr.adapter);
        if (level)
            logger.level = level;
        return logger;
    },
    // canResolve: (pr: LogMetadata, ctx) => {
    //     const managers = ctx.get(LoggerManagers);
    //     if (!managers) {
    //         let local: string;
    //         if (pr.propertyKey && pr.paramName) {
    //             local = ` method ${ctx.propertyKey?.toString()} param ${pr.paramName} of class `
    //         } else if (pr.propertyKey) {
    //             local = ` field ${pr.propertyKey} of class `
    //         } else {
    //             local = ' '
    //         }
    //         throw new ArgumentException(`Autowired logger in${local}${ctx.targetType} failed. It denpendence on LoggerModule in package '@tsdi/logger',  please register LoggerModule first. `)
    //     }
    //     const adapter = pr.adapter;
    //     if (!managers.getLoggerManager(adapter)) {
    //         let local: string;
    //         if (pr.propertyKey && pr.paramName) {
    //             local = ` method ${ctx.propertyKey?.toString()} param ${pr.paramName} of class `
    //         } else if (pr.propertyKey) {
    //             local = ` field ${pr.propertyKey} of class `
    //         } else {
    //             local = ' '
    //         }
    //         throw new ArgumentException(`Autowired logger in${local}${ctx.targetType} failed. It denpendence on '${adapter}' adapter,  please register LogConfigure first. `)
    //     }
    //     return isDefined(pr.logname || pr.target)
    // },
    // resolve: (pr: LogMetadata, ctx, target?: AbstractType) => {
    //     const managers = ctx.get(LoggerManagers);
    //     const level = pr.level;
    //     const logger = managers.getLogger(pr.logname ?? lang.getTypeName(target ?? pr.target), pr.adapter);
    //     if (level) logger.level = level;
    //     return logger
    // }
];
/**
 * InjectLog decorator, for method or class.
 *
 * 日志注入修饰器
 *
 * @InjectLog
 */
exports.InjectLog = (0, ioc_1.createDecorator)('InjectLog', {
    actionType: ioc_1.ActionType.inject,
    init: (ctx) => {
        if (ctx.define.decorType === ioc_1.Decors.parameter || ctx.define.decorType === ioc_1.Decors.property) {
            const metadata = ctx.define.metadata;
            if (!metadata.logname) {
                metadata.target = ctx.classRef.type;
                metadata.resolver = loggerResolvers;
            }
            metadata.propertyKey = ctx.define.propertyKey;
        }
    },
    props: (...args) => {
        if (args.length === 1) {
            const logname = (0, ioc_1.isString)(args[0]) ? args[0] : (0, ioc_1.getTypeName)(args[0]);
            return {
                logname,
                resolver: loggerResolvers
            };
        }
        else if (args.length >= 2) {
            const [message, logname, level] = args;
            if ((0, ioc_1.isString)(logname)) {
                return { message, logname, level };
            }
            else {
                return { message, ...logname };
            }
        }
        return {};
    }
});
exports.Log = exports.InjectLog;
//# sourceMappingURL=metadata.js.map