"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectRepository = exports.Repository = void 0;
const ioc_1 = require("@tsdi/ioc");
const repository_1 = require("./repository");
/**
 * Repository Decorator, to autowired repository for paramerter or filed.
 * @Repository
 */
exports.Repository = (0, ioc_1.createDecorator)('Repository', {
    actionType: ioc_1.ActionType.inject,
    props: (model, connection) => ({ model, connection, resolver: [repository_1.RepositoryArgumentResolver] })
});
/**
 * Repository Decorator, to autowired repository for paramerter or filed.
 * alias of @Repository
 *
 * @alias
 */
exports.InjectRepository = exports.Repository;
//# sourceMappingURL=metadata.js.map