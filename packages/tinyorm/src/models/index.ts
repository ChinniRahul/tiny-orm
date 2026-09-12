import { TinyORM } from '../database';
import { SchemaDefinition, ModelDefinition } from '../schema/types';
import { QueryBuilder } from '../query/builder';
import {
  WhereCondition,
  FindManyArgs,
  FindUniqueArgs,
  CreateArgs,
  UpdateArgs,
  DeleteArgs,
} from '../query/types';

export class Model<T, S extends SchemaDefinition> {
  private orm: TinyORM<S>;
  private modelName: string;
  private definition: ModelDefinition;

  constructor(orm: TinyORM<S>, modelName: string, definition: ModelDefinition) {
    this.orm = orm;
    this.modelName = modelName;
    this.definition = definition;
  }

  private get tableName(): string {
    return this.definition.tableName;
  }

  async findMany(args?: FindManyArgs<T>): Promise<T[]> {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];

    if (args?.where) {
      const { sql: whereSql, params: whereParams } = QueryBuilder.buildWhere(args.where);
      if (whereSql) {
        sql += ` ${whereSql}`;
        params.push(...whereParams);
      }
    }

    if (args?.orderBy) {
      const orderBySql = QueryBuilder.buildOrderBy(args.orderBy);
      if (orderBySql) {
        sql += ` ${orderBySql}`;
      }
    }

    if (args?.limit !== undefined) {
      sql += ` LIMIT ?`;
      params.push(args.limit);
    }

    if (args?.offset !== undefined) {
      sql += ` OFFSET ?`;
      params.push(args.offset);
    }

    const results = this.orm.query(sql, params) as T[];
    
    if (args?.include && this.definition.relations && results.length > 0) {
      for (const [relName, relValue] of Object.entries(args.include)) {
        if (relValue && this.definition.relations[relName]) {
          const relation = this.definition.relations[relName];
          const relatedModelDef = this.orm.schema[relation.model];
          if (!relatedModelDef) continue;
          
          if (relation.type === 'hasMany') {
            const pkField = Object.entries(this.definition.fields).find(([_, def]) => def.primaryKey)?.[0] || 'id';
            const ids = results.map(r => (r as any)[pkField]).filter(id => id !== undefined && id !== null);
            
            if (ids.length > 0) {
              const placeholders = ids.map(() => '?').join(', ');
              const relSql = `SELECT * FROM ${relatedModelDef.tableName} WHERE ${relation.foreignKey} IN (${placeholders})`;
              const relatedRecords = this.orm.query(relSql, ids);
              
              for (const result of results) {
                (result as any)[relName] = relatedRecords.filter(r => r[relation.foreignKey] === (result as any)[pkField]);
              }
            } else {
              for (const result of results) {
                (result as any)[relName] = [];
              }
            }
          } else if (relation.type === 'belongsTo') {
            const relPkField = Object.entries(relatedModelDef.fields).find(([_, def]) => def.primaryKey)?.[0] || 'id';
            const fkValues = results.map(r => (r as any)[relation.foreignKey]).filter(val => val !== undefined && val !== null);
            const uniqueFkValues = Array.from(new Set(fkValues));
            
            if (uniqueFkValues.length > 0) {
              const placeholders = uniqueFkValues.map(() => '?').join(', ');
              const relSql = `SELECT * FROM ${relatedModelDef.tableName} WHERE ${relPkField} IN (${placeholders})`;
              const relatedRecords = this.orm.query(relSql, uniqueFkValues);
              
              const recordMap = new Map();
              for (const r of relatedRecords) {
                recordMap.set(r[relPkField], r);
              }
              
              for (const result of results) {
                const fkValue = (result as any)[relation.foreignKey];
                (result as any)[relName] = recordMap.get(fkValue) || null;
              }
            } else {
              for (const result of results) {
                (result as any)[relName] = null;
              }
            }
          }
        }
      }
    }

    return results;
  }

  async findFirst(args?: FindManyArgs<T>): Promise<T | null> {
    const results = await this.findMany({ ...args, limit: 1 });
    return results[0] || null;
  }

  async findUnique(args: FindUniqueArgs<T>): Promise<T | null> {
    const results = await this.findMany({ where: args.where, include: args.include, limit: 1 });
    return results[0] || null;
  }

  async create(args: CreateArgs<T>): Promise<T> {
    const keys = Object.keys(args.data);
    const values = Object.values(args.data);
    
    if (keys.length === 0) {
      throw new Error('Cannot create record with empty data');
    }

    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    const result = this.orm.execute(sql, values);
    
    // SQLite returns the last inserted row id
    const id = result.lastInsertRowid;
    
    // Assuming there is an 'id' primary key for simplicity in findUnique.
    // In a full implementation, we'd look up the primary key field from schema.
    const pkField = Object.entries(this.definition.fields).find(([_, def]) => def.primaryKey)?.[0] || 'id';
    
    return this.findUnique({ where: { [pkField]: id } as any }) as Promise<T>;
  }

  async createMany(args: { data: Partial<T>[] }): Promise<{ count: number }> {
    if (args.data.length === 0) {
      return { count: 0 };
    }

    let count = 0;
    // We can use a transaction for bulk insert
    await this.orm.transaction(async (tx) => {
      // Create a temporary model instance bound to the transaction
      const txModel = new Model(tx as any, this.modelName, this.definition);
      for (const item of args.data) {
        await txModel.create({ data: item });
        count++;
      }
    });

    return { count };
  }

  async update(args: UpdateArgs<T>): Promise<T | null> {
    const keys = Object.keys(args.data);
    const values = Object.values(args.data);
    
    if (keys.length === 0) {
      throw new Error('Cannot update record with empty data');
    }

    const setClause = keys.map((key) => `${key} = ?`).join(', ');
    
    const { sql: whereSql, params: whereParams } = QueryBuilder.buildWhere(args.where);
    if (!whereSql) {
      throw new Error('Update requires a where clause');
    }

    const sql = `UPDATE ${this.tableName} SET ${setClause} ${whereSql}`;
    const params = [...values, ...whereParams];
    
    this.orm.execute(sql, params);
    
    return this.findUnique({ where: args.where });
  }

  async updateMany(args: UpdateArgs<T>): Promise<{ count: number }> {
    const keys = Object.keys(args.data);
    const values = Object.values(args.data);
    
    if (keys.length === 0) {
      return { count: 0 };
    }

    const setClause = keys.map((key) => `${key} = ?`).join(', ');
    
    const { sql: whereSql, params: whereParams } = QueryBuilder.buildWhere(args.where);

    const sql = `UPDATE ${this.tableName} SET ${setClause} ${whereSql || ''}`;
    const params = [...values, ...whereParams];
    
    const result = this.orm.execute(sql, params);
    return { count: result.changes };
  }

  async delete(args: DeleteArgs<T>): Promise<T | null> {
    const record = await this.findUnique({ where: args.where });
    if (!record) return null;

    const { sql: whereSql, params: whereParams } = QueryBuilder.buildWhere(args.where);
    if (!whereSql) {
      throw new Error('Delete requires a where clause');
    }

    const sql = `DELETE FROM ${this.tableName} ${whereSql}`;
    this.orm.execute(sql, whereParams);

    return record;
  }

  async deleteMany(args?: DeleteArgs<T>): Promise<{ count: number }> {
    let sql = `DELETE FROM ${this.tableName}`;
    let params: any[] = [];

    if (args?.where) {
      const { sql: whereSql, params: whereParams } = QueryBuilder.buildWhere(args.where);
      if (whereSql) {
        sql += ` ${whereSql}`;
        params = whereParams;
      }
    }

    const result = this.orm.execute(sql, params);
    return { count: result.changes };
  }
  
  async count(args?: { where?: WhereCondition<T> }): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: any[] = [];

    if (args?.where) {
      const { sql: whereSql, params: whereParams } = QueryBuilder.buildWhere(args.where);
      if (whereSql) {
        sql += ` ${whereSql}`;
        params.push(...whereParams);
      }
    }

    const result = this.orm.get(sql, params);
    return result.count;
  }
  
  async exists(args: { where: WhereCondition<T> }): Promise<boolean> {
    const count = await this.count(args);
    return count > 0;
  }
}
