"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationContextFactory = exports.ApplicationContext = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * application context for global.
 * extends {@link Injector} and implements {@link Destroyable}.
 *
 * 应用上下文环境，继承自IOC容器Injector，实现Destroyable接口
 * 提供应用程序运行时的上下文环境，包括模块实例、运行器、事件发布器等
 */
let ApplicationContext = class ApplicationContext extends ioc_1.Injector {
};
exports.ApplicationContext = ApplicationContext;
exports.ApplicationContext = ApplicationContext = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ApplicationContext);
/**
 * application context factory, to create instance of {@link ApplicationContext}.
 * 应用程序上下文工厂，用于创建ApplicationContext实例
 */
let ApplicationContextFactory = class ApplicationContextFactory {
};
exports.ApplicationContextFactory = ApplicationContextFactory;
exports.ApplicationContextFactory = ApplicationContextFactory = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ApplicationContextFactory);
//# sourceMappingURL=ApplicationContext.js.map