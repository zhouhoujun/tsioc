import { Singleton, Type, ObjectMap, Autorun, Token, isFunction, isString, tokenId, Inject } from '@tsdi/ioc';
import { ModelParser, MODEL_PARSER, DBPropertyMetadata } from '@tsdi/boot';
import { getMetadataArgsStorage } from 'typeorm';
import { ColumnMetadataArgs } from 'typeorm/metadata-args/ColumnMetadataArgs';

export const ObjectIDToken: Token<Type> = tokenId<Type>('ObjectID');

const numbExp = /(int|float|double|dec|numeric|number)/;
const intExp = /int/;
const strExp = /(char|var|string|text)/;
const boolExp = /(bool|bit)/;
const timeExp = /(time|date)/;
const arrayExp = /array/;
const bytesExp = /(bytes|bytea)/;

@Singleton(MODEL_PARSER)
@Autorun('setup')
export class TypeOrmModelParser extends ModelParser {

    @Inject(ObjectIDToken)
    private _ObjectID!: Type;

    isObjectId(type: Token) {
        return this._ObjectID && this._ObjectID === type;
    }

    setup() {
        let ObjectID = this._ObjectID
        if (ObjectID) {
            this.getTypeMap()
                .register(ObjectID, (id) => new ObjectID(id));
        }
    }

    protected override getPropertyMeta(type: Type): ObjectMap<DBPropertyMetadata> {
        let metas = {} as any;
        getMetadataArgsStorage().columns.filter(col => col.target === type)
            .forEach(col => {
                metas[col.propertyName] = {
                    propertyKey: col.propertyName,
                    dbtype: isString(col.options.type) ? col.options.type : '',
                    type: this.getModeType(col)
                };
            });

        getMetadataArgsStorage().relations.filter(col => col.target === type)
            .forEach(col => {
                let relaModel = isFunction(col.type) ? col.type() as Token : undefined;
                metas[col.propertyName] = {
                    propertyKey: col.propertyName,
                    provider: relaModel,
                    isProviderType: true,
                    type: (col.relationType === 'one-to-many' || col.relationType === 'many-to-many') ? Array : relaModel
                };
            });
        return metas;
    }

    protected override isExtendBaseType(type: Token, propmeta?: DBPropertyMetadata): boolean {
        if (propmeta?.dbtype) {
            if (intExp.test(propmeta.dbtype)) {
                return true;
            }
        }
        if (this.isObjectId(type)) {
            return true;
        }
        return super.isExtendBaseType(type, propmeta);
    }

    protected override resolveExtendType(type: Token, value: any, propmeta?: DBPropertyMetadata): any {
        if (propmeta?.dbtype) {
            if (intExp.test(propmeta.dbtype)) {
                return parseInt(value);
            }
        }
        if (this.isObjectId(type)) {
            return new this._ObjectID(value);
        }
        return super.resolveExtendType(type, propmeta);
    }

    protected getModeType(col: ColumnMetadataArgs): Token {
        let type: Token = col.options.type!;
        if (type) {
            if (isString(type)) {
                if (type === 'uuid') {
                    return String;
                } else if (numbExp.test(type)) {
                    return Number;
                } else if (boolExp.test(type)) {
                    return Boolean;
                } else if (strExp.test(type)) {
                    return String;
                } else if (timeExp.test(type)) {
                    return Date;
                } else if (arrayExp.test(type)) {
                    return Array;
                } else if (bytesExp.test(type)) {
                    return Buffer
                } else {
                    return Object;
                }
            }
            return type;
        }
        switch (col.mode) {
            case 'objectId':
                type = this._ObjectID;
                break;
        }
        return type;
    }

}
