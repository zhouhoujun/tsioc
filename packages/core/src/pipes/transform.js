"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformModule = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const bytes_1 = require("./formats/bytes");
const date_1 = require("./formats/date");
const time_1 = require("./formats/time");
const json_1 = require("./formats/json");
const cases_1 = require("./cases");
const bool_1 = require("./parses/bool");
const date_2 = require("./parses/date");
const enum_1 = require("./parses/enum");
const float_1 = require("./parses/float");
const int_1 = require("./parses/int");
const json_2 = require("./parses/json");
const number_1 = require("./parses/number");
const string_1 = require("./parses/string");
const slice_1 = require("./slice");
const sort_1 = require("./sort");
const bigint_1 = require("./parses/bigint");
const long_1 = require("./parses/long");
const array_1 = require("./parses/array");
/**
 * transform module.
 */
let TransformModule = class TransformModule {
};
exports.TransformModule = TransformModule;
exports.TransformModule = TransformModule = tslib_1.__decorate([
    (0, ioc_1.Module)({
        exports: [
            cases_1.LowerCasePipe, cases_1.UpperCasePipe, slice_1.SlicePipe, sort_1.SortPipe,
            date_1.DateFormatPipe, json_1.JsonFormatPipe, bytes_1.BytesFormatPipe, time_1.TimeFormatPipe,
            json_2.JsonPipe, date_2.DatePipe, string_1.StringPipe, bool_1.BoolPipe, enum_1.EnumPipe,
            float_1.FloatPipe, int_1.IntPipe, long_1.LongPipe, bigint_1.BigintPipe, number_1.NumberPipe, array_1.ArrayPipe
        ]
    })
], TransformModule);
//# sourceMappingURL=transform.js.map