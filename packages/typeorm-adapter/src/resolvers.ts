import { ModelArgumentResolver } from '@tsdi/core';


const numbExp = /(float|double|dec|numeric|number)/;
const intExp = /int|bigint|int8|int32|int64/;
const strExp = /(char|var|string|text)/;
const boolExp = /(bool|boolean|bit)/;
const timeExp = /(time|date)/;
const arrayExp = /array/;
const bytesExp = /(bytes|bytea)/;


export function createTypeormResolvers(): ModelArgumentResolver[] {
    return [
        {
            canResolve: (parameter, args) => parameter.type
        }
    ];
}