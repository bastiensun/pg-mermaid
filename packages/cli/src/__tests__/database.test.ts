import {
  createConnection,
  getEntities,
  getIndexes,
  getRelationships,
} from '../database';
import { createSqlTag, type DatabasePool } from 'slonik';
import { type StartedPostgreSqlContainer } from 'testcontainers';
import { PostgreSqlContainer } from 'testcontainers';
import { z } from 'zod';

let container: StartedPostgreSqlContainer;
let connection: DatabasePool;

export const sql = createSqlTag({
  typeAliases: {
    void: z.object({}).strict(),
  },
});

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  connection = await createConnection({
    dbname: container.getDatabase(),
    host: container.getHost(),
    password: container.getPassword(),
    port: container.getPort(),
    username: container.getUsername(),
  });
});

beforeEach(async () => {
  await connection.any(
    sql.typeAlias('void')`
      drop schema public cascade;
      create schema public;
    `
  );
});

afterAll(async () => {
  await connection.end();
  await container.stop();
});

describe('getEntities', () => {
  it('should return entities', async () => {
    // Given
    await connection.any(
      sql.typeAlias('void')`
        create table public.user (
          id uuid
        );

        create table post (
          id uuid
        );
      `
    );

    // When
    const tables = await connection.any(getEntities());

    // Then
    expect(tables.map((table) => table.name)).toEqual(['post', 'user']);
  });

  it('should return empty when no entities', async () => {
    // When
    const tables = await connection.any(getEntities());

    // Then
    expect(tables.map((table) => table.name)).toEqual([]);
  });

  it('should return entities by schema', async () => {
    // Given
    const schema = 'base';

    await connection.any(
      sql.typeAlias('void')`
        create schema ${sql.identifier([schema])};
        
        create table ${sql.identifier([schema, 'post'])} (
          id uuid
        );
        
        create table ${sql.identifier([schema, 'user'])} (
          id uuid
        );
      `
    );

    // When
    const tables = await connection.any(getEntities({ schema }));

    // Then
    expect(tables.map((table) => table.name)).toEqual(['post', 'user']);

    await connection.any(
      sql.typeAlias('void')`
        drop schema base cascade;
      `
    );
  });

  it.each([
    { excludedTables: ['post', 'user'], expectedTables: [] },
    { excludedTables: ['post'], expectedTables: ['user'] },
    { excludedTables: ['not_exist_table'], expectedTables: ['post', 'user'] },
    {
      excludedTables: [],
      expectedTables: ['post', 'user'],
    },
    {
      excludedTables: undefined,
      expectedTables: ['post', 'user'],
    },
  ])(
    'should return entities without excluded tables (%j)',
    async ({ excludedTables, expectedTables }) => {
      // Given
      await connection.any(
        sql.typeAlias('void')`
          create table post (
            id uuid
          );

          create table public.user (
            id uuid
          );
        `
      );

      // When
      const tables = await connection.any(getEntities({ excludedTables }));

      // Then
      expect(tables.map((table) => table.name)).toEqual(expectedTables);
    }
  );

  it('should return attributes', async () => {
    // Given
    await connection.any(
      sql.typeAlias('void')`
        create table post (
          id uuid
        );
      `
    );

    // When
    const tables = await connection.any(getEntities());

    // Then
    expect(tables).toEqual([
      {
        attributes: [
          {
            comment: 'null',
            key: null,
            name: 'id',
            type: 'uuid',
          },
        ],
        name: 'post',
      },
    ]);
  });

  it('should return attributes and handle `ARRAY` type', async () => {
    // Given
    await connection.any(
      sql.typeAlias('void')`
        create table post (
          categories text[]
        );
      `
    );

    // When
    const tables = await connection.any(getEntities());

    // Then
    expect(tables).toEqual([
      {
        attributes: [
          {
            comment: 'null',
            key: null,
            name: 'categories',
            type: 'text[]',
          },
        ],
        name: 'post',
      },
    ]);
  });

  it('should return attributes and handle `USER-DEFINED` type', async () => {
    // Given
    await connection.any(
      sql.typeAlias('void')`
        create type role as enum (
          'admin',
          'user'
        );
        
        create table public.user (
          role role
        );
      `
    );

    // When
    const tables = await connection.any(getEntities());

    // Then
    expect(tables).toEqual([
      {
        attributes: [
          {
            comment: 'null',
            key: null,
            name: 'role',
            type: 'role',
          },
        ],
        name: 'user',
      },
    ]);
  });

  it('should return attributes and handle multi-word type', async () => {
    // Given
    await connection.any(
      sql.typeAlias('void')`
        create table post (
          created_at timestamp without time zone
        );
      `
    );

    // When
    const tables = await connection.any(getEntities());

    // Then
    expect(tables).toEqual([
      {
        attributes: [
          {
            comment: 'null',
            key: null,
            name: 'created_at',
            type: 'timestamp_without_time_zone',
          },
        ],
        name: 'post',
      },
    ]);
  });

  it('should return attributes with not null and null comment', async () => {
    // Given
    await connection.any(
      sql.typeAlias('void')`
        create table public.user (
          email text not null,
          name text null
        );
      `
    );

    // When
    const tables = await connection.any(getEntities());

    // Then
    expect(tables).toEqual([
      {
        attributes: [
          {
            comment: 'not null',
            key: null,
            name: 'email',
            type: 'text',
          },
          {
            comment: 'null',
            key: null,
            name: 'name',
            type: 'text',
          },
        ],
        name: 'user',
      },
    ]);
  });

  it('should return attributes with primary key', async () => {
    // Given
    await connection.any(
      sql.typeAlias('void')`
        create table post (
          id uuid primary key
        );
      `
    );

    // When
    const tables = await connection.any(getEntities());

    // Then
    expect(tables).toEqual([
      {
        attributes: [
          {
            comment: 'not null',
            key: 'PK',
            name: 'id',
            type: 'uuid',
          },
        ],
        name: 'post',
      },
    ]);
  });

  it('should return attributes with foreign key', async () => {
    // Given
    await connection.any(
      sql.typeAlias('void')`
        create table public.user (
          id uuid primary key
        );

        create table post (
          author_id uuid references public.user(id)
        );
      `
    );

    // When
    const tables = await connection.any(getEntities());

    // Then
    expect(tables).toEqual([
      {
        attributes: [
          {
            comment: 'null',
            key: 'FK',
            name: 'author_id',
            type: 'uuid',
          },
        ],
        name: 'post',
      },
      {
        attributes: [
          {
            comment: 'not null',
            key: 'PK',
            name: 'id',
            type: 'uuid',
          },
        ],
        name: 'user',
      },
    ]);
  });

  it('should return attributes in order', async () => {
    // Given
    await connection.any(
      sql.typeAlias('void')`
        create type user_defined_type as enum (
          'type1',
          'type2'
        );

        create table public.user (
          id uuid primary key
        );

        create table post (
          id uuid primary key,
          published2 text null,
          published4 text not null,
          published1 text[] not null,
          published3 text not null,
          title boolean,
          author_id uuid references public.user (id)
        );
      `
    );

    // When
    const tables = await connection.any(getEntities());

    // Then
    expect(tables).toEqual([
      {
        attributes: [
          {
            comment: 'not null',
            key: 'PK',
            name: 'id',
            type: 'uuid',
          },
          {
            comment: 'null',
            key: 'FK',
            name: 'author_id',
            type: 'uuid',
          },
          {
            comment: 'not null',
            key: null,
            name: 'published3',
            type: 'text',
          },
          {
            comment: 'not null',
            key: null,
            name: 'published4',
            type: 'text',
          },
          {
            comment: 'not null',
            key: null,
            name: 'published1',
            type: 'text[]',
          },
          {
            comment: 'null',
            key: null,
            name: 'title',
            type: 'boolean',
          },
          {
            comment: 'null',
            key: null,
            name: 'published2',
            type: 'text',
          },
        ],
        name: 'post',
      },
      {
        attributes: [
          {
            comment: 'not null',
            key: 'PK',
            name: 'id',
            type: 'uuid',
          },
        ],
        name: 'user',
      },
    ]);
  });
});

describe('getRelationships', () => {
  it('should return relationships', async () => {
    // Given
    await connection.any(
      sql.typeAlias('void')`
        create table public.user (
          id uuid primary key
        );

        create table post (
          author_id uuid references public.user(id)
        );
      `
    );

    // When
    const relationships = await connection.any(getRelationships());

    // Then
    expect(relationships).toEqual([
      {
        child: { attributes: ['author_id'], entity: 'post' },
        parent: { attributes: ['id'], entity: 'user' },
      },
    ]);
  });

  it('should return relationships in order', async () => {
    // Given
    await connection.any(
      sql.typeAlias('void')`
        create table public.user1 (
          id uuid primary key
        );

        create table public.user2 (
          id uuid primary key
        );

        create table post (
          author_id1 uuid,
          author_id2 uuid,
          foreign key (author_id2) references user2(id),
          foreign key (author_id1) references user2(id),
          foreign key (author_id1) references user1(id)
        );
      `
    );

    // When
    const relationships = await connection.any(getRelationships());

    // Then
    expect(relationships).toEqual([
      {
        child: { attributes: ['author_id1'], entity: 'post' },
        parent: { attributes: ['id'], entity: 'user1' },
      },
      {
        child: { attributes: ['author_id1'], entity: 'post' },
        parent: { attributes: ['id'], entity: 'user2' },
      },
      {
        child: { attributes: ['author_id2'], entity: 'post' },
        parent: { attributes: ['id'], entity: 'user2' },
      },
    ]);
  });

  it('should return empty when no relationships', async () => {
    // When
    const relationships = await connection.any(getRelationships());

    // Then
    expect(relationships).toEqual([]);
  });

  it('should return relationships by schema', async () => {
    // Given
    const schema = 'base';

    await connection.any(
      sql.typeAlias('void')`
        create schema ${sql.identifier([schema])};
        
        create table ${sql.identifier([schema, 'user'])} (
          id uuid primary key
        );
        
        create table ${sql.identifier([schema, 'post'])} (
          author_id uuid references ${sql.identifier([schema, 'user'])} (id)
        );
      `
    );

    // When
    const relationships = await connection.any(getRelationships({ schema }));

    // Then
    expect(relationships).toEqual([
      {
        child: { attributes: ['author_id'], entity: 'post' },
        parent: { attributes: ['id'], entity: 'user' },
      },
    ]);

    await connection.any(
      sql.typeAlias('void')`
        drop schema ${sql.identifier([schema])} cascade;
      `
    );
  });

  it.each([
    { excludedTables: ['post', 'user'], expectedRelationships: [] },
    {
      excludedTables: ['not_exist_table'],
      expectedRelationships: [
        {
          child: { attributes: ['author_id'], entity: 'post' },
          parent: { attributes: ['id'], entity: 'user' },
        },
      ],
    },
    {
      excludedTables: [],
      expectedRelationships: [
        {
          child: { attributes: ['author_id'], entity: 'post' },
          parent: { attributes: ['id'], entity: 'user' },
        },
      ],
    },
    {
      excludedTables: undefined,
      expectedRelationships: [
        {
          child: { attributes: ['author_id'], entity: 'post' },
          parent: { attributes: ['id'], entity: 'user' },
        },
      ],
    },
  ])(
    'should return relationships without excluded tables (%j)',
    async ({ excludedTables, expectedRelationships }) => {
      // Given
      await connection.any(
        sql.typeAlias('void')`
          create table public.user (
            id uuid primary key
          );

          create table post (
            author_id uuid references public.user (id)
          );
        `
      );

      // When
      const actualRelationships = await connection.any(
        getRelationships({ excludedTables })
      );

      // Then
      expect(actualRelationships).toEqual(expectedRelationships);
    }
  );
});

describe('getIndexes', () => {
  it('should return indexes', async () => {
    // Given
    await connection.any(
      sql.typeAlias('void')`
        create table post (
          id uuid primary key
        );
      `
    );

    // When
    const indexes = await connection.any(getIndexes());

    // Then
    expect(indexes).toEqual([{ indexes: ['post_pkey'], name: 'post' }]);
  });

  it('should return indexes in order', async () => {
    // Given
    await connection.any(
      sql.typeAlias('void')`
        create table post2 (
          id1 uuid unique,
          id2 uuid unique
        );

        create table post1 (
          id uuid primary key
        );
      `
    );

    // When
    const indexes = await connection.any(getIndexes());

    // Then
    expect(indexes).toEqual([
      { indexes: ['post1_pkey'], name: 'post1' },
      { indexes: ['post2_id1_key', 'post2_id2_key'], name: 'post2' },
    ]);
  });

  it('should return empty when no indexes', async () => {
    // Given
    await connection.any(
      sql.typeAlias('void')`
        create table post (
          id uuid
        );
      `
    );

    // When
    const indexes = await connection.any(getIndexes());

    // Then
    expect(indexes).toEqual([]);
  });

  it('should return indexes by schema', async () => {
    // Given
    const schema = 'base';

    await connection.any(
      sql.typeAlias('void')`
        create schema ${sql.identifier([schema])};
        create table ${sql.identifier([schema, 'post'])} (
          id uuid primary key
        );
      `
    );

    // When
    const indexes = await connection.any(getIndexes({ schema }));

    // Then
    expect(indexes).toEqual([{ indexes: ['post_pkey'], name: 'post' }]);

    await connection.any(
      sql.typeAlias('void')`
        drop schema base cascade;
      `
    );
  });

  it.each([
    {
      excludedTables: ['post', 'user'],
      expectedIndexes: [],
    },
    {
      excludedTables: ['not_exist_table'],
      expectedIndexes: [
        { indexes: ['post_pkey'], name: 'post' },
        { indexes: ['user_pkey'], name: 'user' },
      ],
    },
    {
      excludedTables: [],
      expectedIndexes: [
        { indexes: ['post_pkey'], name: 'post' },
        { indexes: ['user_pkey'], name: 'user' },
      ],
    },
    {
      excludedTables: undefined,
      expectedIndexes: [
        { indexes: ['post_pkey'], name: 'post' },
        { indexes: ['user_pkey'], name: 'user' },
      ],
    },
  ])(
    'should return indexes without excluded tables (%j)',
    async ({ excludedTables, expectedIndexes }) => {
      // Given
      await connection.any(
        sql.typeAlias('void')`
          create table post (
            id uuid primary key
          );

          create table public.user (
            id uuid primary key
          );
        `
      );

      // When
      const actualIndexes = await connection.any(
        getIndexes({ excludedTables })
      );

      // Then
      expect(actualIndexes).toEqual(expectedIndexes);
    }
  );
});
