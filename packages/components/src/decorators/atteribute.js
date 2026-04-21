"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Attribute = void 0;
const ioc_1 = require("@tsdi/ioc");
exports.Attribute = (0, ioc_1.createDecorator)('Attribute', {
    props: (alias, required) => {
        return {
            alias,
            required,
            nullable: true
        };
    },
});
//# sourceMappingURL=atteribute.js.map