import { WhereCondition, OrderByCondition, FilterOperator } from './types';

export class QueryBuilder {
  static buildWhere<T>(where?: WhereCondition<T>): { sql: string; params: any[] } {
    if (!where || Object.keys(where).length === 0) {
      return { sql: '', params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];

    const processCondition = (key: string, value: any, operator: string = '=') => {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Handle nested operators
        for (const [op, opValue] of Object.entries(value)) {
          switch (op as FilterOperator) {
            case 'eq':
              conditions.push(`${key} = ?`);
              params.push(opValue);
              break;
            case 'neq':
              conditions.push(`${key} != ?`);
              params.push(opValue);
              break;
            case 'gt':
              conditions.push(`${key} > ?`);
              params.push(opValue);
              break;
            case 'gte':
              conditions.push(`${key} >= ?`);
              params.push(opValue);
              break;
            case 'lt':
              conditions.push(`${key} < ?`);
              params.push(opValue);
              break;
            case 'lte':
              conditions.push(`${key} <= ?`);
              params.push(opValue);
              break;
            case 'in':
              if (Array.isArray(opValue) && opValue.length > 0) {
                const placeholders = opValue.map(() => '?').join(', ');
                conditions.push(`${key} IN (${placeholders})`);
                params.push(...opValue);
              }
              break;
            case 'notIn':
              if (Array.isArray(opValue) && opValue.length > 0) {
                const placeholders = opValue.map(() => '?').join(', ');
                conditions.push(`${key} NOT IN (${placeholders})`);
                params.push(...opValue);
              }
              break;
            case 'contains':
              conditions.push(`${key} LIKE ?`);
              params.push(`%${opValue}%`);
              break;
            case 'startsWith':
              conditions.push(`${key} LIKE ?`);
              params.push(`${opValue}%`);
              break;
            case 'endsWith':
              conditions.push(`${key} LIKE ?`);
              params.push(`%${opValue}`);
              break;
            case 'isNull':
              if (opValue) conditions.push(`${key} IS NULL`);
              else conditions.push(`${key} IS NOT NULL`);
              break;
            case 'isNotNull':
              if (opValue) conditions.push(`${key} IS NOT NULL`);
              else conditions.push(`${key} IS NULL`);
              break;
          }
        }
      } else {
        // Direct assignment (eq)
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    };

    // Handle logical operators
    if (where.AND && Array.isArray(where.AND)) {
      const andConditions = where.AND.map(w => QueryBuilder.buildWhere(w));
      const validAnds = andConditions.filter(c => c.sql.length > 0);
      if (validAnds.length > 0) {
        conditions.push(`(${validAnds.map(c => c.sql.replace(/^WHERE /, '')).join(' AND ')})`);
        params.push(...validAnds.flatMap(c => c.params));
      }
    }
    
    if (where.OR && Array.isArray(where.OR)) {
      const orConditions = where.OR.map(w => QueryBuilder.buildWhere(w));
      const validOrs = orConditions.filter(c => c.sql.length > 0);
      if (validOrs.length > 0) {
        conditions.push(`(${validOrs.map(c => c.sql.replace(/^WHERE /, '')).join(' OR ')})`);
        params.push(...validOrs.flatMap(c => c.params));
      }
    }

    if (where.NOT) {
      const notCondition = QueryBuilder.buildWhere(where.NOT);
      if (notCondition.sql.length > 0) {
        conditions.push(`NOT (${notCondition.sql.replace(/^WHERE /, '')})`);
        params.push(...notCondition.params);
      }
    }

    // Handle standard fields
    for (const [key, value] of Object.entries(where)) {
      if (key !== 'AND' && key !== 'OR' && key !== 'NOT') {
        processCondition(key, value);
      }
    }

    if (conditions.length === 0) {
      return { sql: '', params: [] };
    }

    return {
      sql: `WHERE ${conditions.join(' AND ')}`,
      params,
    };
  }

  static buildOrderBy<T>(orderBy?: OrderByCondition<T>): string {
    if (!orderBy || Object.keys(orderBy).length === 0) {
      return '';
    }

    const clauses = Object.entries(orderBy).map(([key, direction]) => {
      return `${key} ${direction === 'desc' ? 'DESC' : 'ASC'}`;
    });

    return `ORDER BY ${clauses.join(', ')}`;
  }
}
