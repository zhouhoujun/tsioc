import { Module } from '@tsdi/ioc';
import { BytesFormatPipe } from './formats/bytes';
import { DateFormatPipe } from './formats/date';
import { TimeFormatPipe } from './formats/time';
import { JsonFormatPipe } from './formats/json';
import { LowerCasePipe, UpperCasePipe } from './cases';
import { BoolPipe } from './parses/bool';
import { DatePipe } from './parses/date';
import { EnumPipe } from './parses/enum';
import { FloatPipe } from './parses/float';
import { BigintPipe, IntPipe } from './parses/int';
import { JsonPipe } from './parses/json';
import { NumberPipe } from './parses/number';
import { StringPipe } from './parses/string';
import { SlicePipe } from './slice';
import { SortPipe } from './sort';

/*
 * Transform module.
 */
@Module({
    exports: [
        LowerCasePipe, UpperCasePipe, SlicePipe, SortPipe,
        DateFormatPipe, JsonFormatPipe, BytesFormatPipe, TimeFormatPipe,
        JsonPipe, DatePipe, StringPipe, BoolPipe, EnumPipe,
        FloatPipe, IntPipe, BigintPipe, NumberPipe
    ]
})
export class TransformModule {

}
