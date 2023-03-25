import { EntitySchema, RelationshipSchema, TableIndexesSchema } from './types';
import { createPool, type DatabasePool, sql } from 'slonik';

type createConnectionParameters = {
  dbname: string;
  host?: string;
  password: string;
  port?: number;
  username: string;
};
export const createConnection = async ({
  dbname,
  host = 'localhost',
  password,
  port = 5_432,
  username,
}: createConnectionParameters): Promise<DatabasePool> => {
  return createPool(
    `postgres://${username}:${password}@${host}:${port}/${dbname}`
  );
};

type GetEntitiesParameters = {
  excludedTables?: string[];
  schema?: string;
};
export const getEntities = ({
  excludedTables = [],
  schema = 'public',
}: GetEntitiesParameters = {}) => sql.type(EntitySchema)`
  select 
    columns.table_name as name,
    json_agg(
      json_build_object(
        'comment',
        case
          when columns.is_nullable = 'YES' then 'null'
          when columns.is_nullable = 'NO' then 'not null'
        end,
        'key',
        case
          when table_constraints.constraint_type = 'PRIMARY KEY' then 'PK'
          when table_constraints.constraint_type = 'FOREIGN KEY' then 'FK'
        end,
        'name',
        columns.column_name,
        'type',
        case
          when columns.data_type = 'ARRAY' then concat(regexp_replace(columns.udt_name, '^_', ''), '[]')
          when columns.data_type = 'USER-DEFINED' then columns.udt_name
          else replace(columns.data_type, ' ', '_')
        end
      )
      order by
        case
          when table_constraints.constraint_type = 'PRIMARY KEY' then 1
          when table_constraints.constraint_type = 'FOREIGN KEY' then 2
          else 3
        end,
        columns.is_nullable,
        case
          when columns.data_type = 'ARRAY' then concat(regexp_replace(columns.udt_name, '^_', ''), '[]')
          when columns.data_type = 'USER-DEFINED' then columns.udt_name
          else columns.data_type
        end,
        columns.column_name
    ) as attributes
    from 
      information_schema.columns
      left join information_schema.key_column_usage
        on key_column_usage.table_schema = columns.table_schema
        and key_column_usage.table_name = columns.table_name
        and key_column_usage.column_name = columns.column_name
      left join information_schema.table_constraints
        on table_constraints.table_schema = key_column_usage.table_schema
        and table_constraints.table_name = key_column_usage.table_name
        and table_constraints.constraint_name = key_column_usage.constraint_name
    where 
      columns.table_schema = ${schema}
      and columns.table_name != all(${sql.array(excludedTables, 'text')})
    group by 
      name
    order by 
      name;
`;

type GetRelationshipsParameters = {
  excludedTables?: string[];
  schema?: string;
};
export const getRelationships = ({
  excludedTables = [],
  schema = 'public',
}: GetRelationshipsParameters = {}) => sql.type(RelationshipSchema)`
  select
    json_build_object(
      'entity',
      child_key_column_usage.table_name,
      'attributes',
      json_agg(distinct child_key_column_usage.column_name)
    ) as child,
    json_build_object(
      'entity',
      parent_key_column_usage.table_name,
      'attributes',
      json_agg(distinct parent_key_column_usage.column_name)
    ) as parent
  from
    information_schema.referential_constraints
    join information_schema.key_column_usage as child_key_column_usage
      on child_key_column_usage.constraint_schema = referential_constraints.constraint_schema
      and child_key_column_usage.constraint_name = referential_constraints.constraint_name
      and child_key_column_usage.table_name != all(${sql.array(
        excludedTables,
        'text'
      )})
    join information_schema.key_column_usage as parent_key_column_usage
      on parent_key_column_usage.constraint_schema = referential_constraints.unique_constraint_schema
      and parent_key_column_usage.constraint_name = referential_constraints.unique_constraint_name
      and parent_key_column_usage.table_name != all(${sql.array(
        excludedTables,
        'text'
      )})
  where
    referential_constraints.constraint_schema = ${schema}
  group by 
    child_key_column_usage.constraint_name,
    child_key_column_usage.table_name,
    parent_key_column_usage.table_name
  order by 
    parent_key_column_usage.table_name,
    child_key_column_usage.table_name;
`;

type GetIndexesParameters = {
  excludedTables?: string[];
  schema?: string;
};
export const getIndexes = ({
  excludedTables = [],
  schema = 'public',
}: GetIndexesParameters = {}) => sql.type(TableIndexesSchema)`
  select
    tablename as name,
    json_agg(indexname order by indexname) as indexes
  from
    pg_indexes
  where
    schemaname = ${schema}
    and tablename != all(${sql.array(excludedTables, 'text')})
  group by 
    tablename
  order by 
    tablename;
`;
