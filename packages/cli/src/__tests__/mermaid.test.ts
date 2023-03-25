import { generateDiagram } from '../mermaid';
import { stripIndent } from 'common-tags';

it.each([
  {
    entities: [
      {
        attributes: [],
        name: 'category',
      },
      {
        attributes: [
          {
            comment: 'not null' as const,
            key: 'PK' as const,
            name: 'id',
            type: 'uuid',
          },
          {
            comment: 'null' as const,
            key: 'FK' as const,
            name: 'author_id',
            type: 'uuid',
          },
        ],
        name: 'post',
      },
      {
        attributes: [
          {
            comment: 'null' as const,
            key: null,
            name: 'id',
            type: 'uuid',
          },
        ],
        name: 'user',
      },
    ],
    expectedDiagram: stripIndent`
      erDiagram

          category {
          }

          post {
              id uuid PK "not null"
              author_id uuid FK "null"
          }

          user {
              id uuid "null"
          }
    `,
  },
  {
    entities: [
      {
        attributes: [
          {
            comment: 'null' as const,
            key: null,
            name: 'id',
            type: 'uuid',
          },
        ],
        name: 'post',
      },
    ],
    expectedDiagram: stripIndent`
      erDiagram

          post {
              id uuid "null"
          }
    `,
  },
  {
    entities: [],
    expectedDiagram: stripIndent`
      erDiagram
    `,
  },
  {
    entities: undefined,
    expectedDiagram: stripIndent`
      erDiagram
    `,
  },
])(
  'should return diagram with entities (%j)',
  async ({ entities, expectedDiagram }) => {
    // When
    const actualDiagram = generateDiagram({ entities });

    // Then
    expect(actualDiagram).toEqual(expectedDiagram);
  }
);

it.each([
  {
    expectedDiagram: stripIndent`
      erDiagram

          user1 ||--o{ post1 : "post1(author_id1, author_id2) -> user1(id1, id2)"
          user2 ||--o{ post2 : "post2(author_id) -> user2(id)"
    `,
    relationships: [
      {
        child: { attributes: ['author_id1', 'author_id2'], entity: 'post1' },
        parent: { attributes: ['id1', 'id2'], entity: 'user1' },
      },
      {
        child: { attributes: ['author_id'], entity: 'post2' },
        parent: { attributes: ['id'], entity: 'user2' },
      },
    ],
  },
  {
    expectedDiagram: stripIndent`
      erDiagram

          user ||--o{ post : "post(author_id) -> user(id)"
    `,
    relationships: [
      {
        child: { attributes: ['author_id'], entity: 'post' },
        parent: { attributes: ['id'], entity: 'user' },
      },
    ],
  },
  {
    expectedDiagram: stripIndent`
      erDiagram
    `,
    relationships: [],
  },
  {
    expectedDiagram: stripIndent`
      erDiagram
    `,
    relationships: undefined,
  },
])(
  'should return diagram with relationships (%j)',
  async ({ relationships, expectedDiagram }) => {
    // When
    const actualDiagram = generateDiagram({ relationships });

    // Then
    expect(actualDiagram).toEqual(expectedDiagram);
  }
);

it('should return diagram with entities and relationships', async () => {
  // Given
  const entities = [
    {
      attributes: [
        {
          comment: 'null' as const,
          key: null,
          name: 'id',
          type: 'uuid',
        },
      ],
      name: 'post',
    },
    {
      attributes: [
        {
          comment: 'null' as const,
          key: null,
          name: 'id',
          type: 'uuid',
        },
      ],
      name: 'user',
    },
  ];

  const relationships = [
    {
      child: { attributes: ['author_id'], entity: 'post' },
      parent: { attributes: ['id'], entity: 'user' },
    },
  ];

  // When
  const actualDiagram = generateDiagram({ entities, relationships });

  // Then
  const expectedDiagram = stripIndent`
    erDiagram

        post {
            id uuid "null"
        }

        user {
            id uuid "null"
        }

        user ||--o{ post : "post(author_id) -> user(id)"
  `;

  expect(actualDiagram).toEqual(expectedDiagram);
});
