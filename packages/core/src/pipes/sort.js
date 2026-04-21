"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SortPipe = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../metadata");
/**
 * sort pipe
 *
 * @example
 *
 * list | sort: 'desc' :'id'
 * list | sort: 'desc'
 * list | sort: { order:'desc'}
 *
 * list | sort: {sort: 'id' order:'desc'}
 *
 */
let SortPipe = class SortPipe {
    transform(value, option, orderby) {
        if (!value || value.length < 1)
            return [];
        const { sort, order } = ((0, ioc_1.isString)(option) ? { order: option, sort: orderby } : option);
        let type = sort ? typeof value[0]?.[sort] : typeof value[0];
        if (type === _tyundef) {
            value.some(i => {
                if (i[sort] == null)
                    return false;
                type = typeof i[sort];
                if (type === _tyundef) {
                    return false;
                }
                return type;
            });
        }
        if (type === _tystr) {
            return value.sort((a, b) => {
                const x = sort ? a[sort] : a;
                const y = sort ? b[sort] : b;
                return this.compare(x?.toLowerCase() ?? '', y?.toLowerCase() ?? '', order);
            });
        }
        return value.sort((a, b) => {
            const x = sort ? a[sort] : a;
            const y = sort ? b[sort] : b;
            return this.compare(x, y, order);
        });
    }
    compare(x, y, order) {
        if (x < y) {
            return order === 'desc' ? 1 : -1;
        }
        if (x > y) {
            return order === 'desc' ? -1 : 1;
        }
        return 0;
    }
};
exports.SortPipe = SortPipe;
exports.SortPipe = SortPipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)({
        selector: 'sort'
    })
], SortPipe);
const _tyundef = 'undefined';
const _tystr = 'string';
//# sourceMappingURL=sort.js.map