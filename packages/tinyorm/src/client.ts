import { TinyORM } from './database';
import { SchemaDefinition, InferSchema } from './schema/types';
import { Model } from './models';

export type ClientModels<S extends SchemaDefinition> = {
  [K in keyof S]: Model<InferSchema<S>[K], S>;
};

export class TinyClient<S extends SchemaDefinition> {
  public db: TinyORM<S>;
  private models: Map<string, any> = new Map();

  constructor(dbPath: string, schema: S, options?: { logger?: (query: string, params: any[], duration: number) => void }) {
    this.db = new TinyORM(dbPath, schema, options);
    
    // Initialize models
    for (const [modelName, modelDef] of Object.entries(schema)) {
      this.models.set(modelName, new Model(this.db, modelName, modelDef));
    }
    
    // Create a proxy to allow dynamic access like `client.user.findMany()`
    return new Proxy(this, {
      get: (target, prop: string) => {
        if (prop in target) {
          return (target as any)[prop];
        }
        if (target.models.has(prop)) {
          return target.models.get(prop);
        }
        return undefined;
      }
    }) as any;
  }

  // To support strong typing, we cast the client instance.
  // The actual implementation is hidden behind the proxy.
}

// Helper function to create a strongly typed client
export function createClient<S extends SchemaDefinition>(dbPath: string, schema: S, options?: { logger?: (query: string, params: any[], duration: number) => void }): TinyClient<S> & ClientModels<S> {
  return new TinyClient(dbPath, schema, options) as any;
}
