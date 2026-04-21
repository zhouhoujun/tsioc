"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AfterScenario = exports.BeforeScenario = exports.But = exports.And = exports.Then = exports.When = exports.Given = void 0;
const ioc_1 = require("@tsdi/ioc");
exports.Given = (0, ioc_1.createDecorator)('Given', {
    actionType: ioc_1.ActionType.declaration,
    props: (description, timeout) => ({ description, timeout, stepType: 'Given' })
});
exports.When = (0, ioc_1.createDecorator)('When', {
    actionType: ioc_1.ActionType.declaration,
    props: (description, timeout) => ({ description, timeout, stepType: 'When' })
});
exports.Then = (0, ioc_1.createDecorator)('Then', {
    actionType: ioc_1.ActionType.declaration,
    props: (description, timeout) => ({ description, timeout, stepType: 'Then' })
});
exports.And = (0, ioc_1.createDecorator)('And', {
    actionType: ioc_1.ActionType.declaration,
    props: (description, timeout) => ({ description, timeout, stepType: 'And' })
});
exports.But = (0, ioc_1.createDecorator)('But', {
    actionType: ioc_1.ActionType.declaration,
    props: (description, timeout) => ({ description, timeout, stepType: 'But' })
});
exports.BeforeScenario = (0, ioc_1.createDecorator)('BeforeScenario', {
    actionType: ioc_1.ActionType.declaration
});
exports.AfterScenario = (0, ioc_1.createDecorator)('AfterScenario', {
    actionType: ioc_1.ActionType.declaration
});
//# sourceMappingURL=E2EMetadata.js.map