export type FieldType = 'string' | 'number' | 'boolean' | 'date';

export interface FieldDefinition {
  type: FieldType;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  nullable?: boolean;
  default?: any;
}

export interface ModelDefinition {
  tableName: string;
  fields: Record<string, FieldDefinition>;
  relations?: Record<string, RelationDefinition>;
}

export interface RelationDefinition {
  type: 'hasMany' | 'belongsTo';
  model: string;
  foreignKey: string;
}

export interface SchemaDefinition {
  [modelName: string]: ModelDefinition;
}

// Type inference utilities
export type InferFieldType<F extends FieldDefinition> = F['type'] extends 'string'
  ? string
  : F['type'] extends 'number'
    ? number
    : F['type'] extends 'boolean'
      ? boolean
      : F['type'] extends 'date'
        ? Date
        : never;

export type InferModel<M extends ModelDefinition, S extends SchemaDefinition> = {
  [K in keyof M['fields']]: M['fields'][K]['nullable'] extends true
    ? InferFieldType<M['fields'][K]> | null
    : InferFieldType<M['fields'][K]>;
} & (M['relations'] extends Record<string, RelationDefinition>
  ? {
      [R in keyof M['relations']]?: M['relations'][R]['type'] extends 'hasMany'
        ? M['relations'][R]['model'] extends keyof S
          ? Array<InferModel<S[M['relations'][R]['model']], S>>
          : any[]
        : M['relations'][R]['model'] extends keyof S
        ? InferModel<S[M['relations'][R]['model']], S>
        : any;
    }
  : {});

export type InferSchema<S extends SchemaDefinition> = {
  [K in keyof S]: InferModel<S[K], S>;
};
