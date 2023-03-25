import { generateMarkdown } from '../markdown';
import { stripIndent } from 'common-tags';

const cases = [
  {
    expectedMarkdown: stripIndent`
      ## Diagram

      \`\`\`mermaid
      erDiagram

          post {
              id uuid
          }
      \`\`\`

      ## Indexes

      ### \`post\`

      - \`post_pkey\`

      ### \`user\`

      - \`user_email_key\`
      - \`user_pkey\`
    `,
    indexes: [
      { indexes: [], name: 'category' },
      { indexes: ['post_pkey'], name: 'post' },
      { indexes: ['user_email_key', 'user_pkey'], name: 'user' },
    ],
  },
  {
    expectedMarkdown: stripIndent`
      ## Diagram

      \`\`\`mermaid
      erDiagram

          post {
              id uuid
          }
      \`\`\`

      ## Indexes

      ### \`post\`

      - \`post_pkey\`
    `,
    indexes: [{ indexes: ['post_pkey'], name: 'post' }],
  },
  {
    expectedMarkdown: stripIndent`
      ## Diagram

      \`\`\`mermaid
      erDiagram

          post {
              id uuid
          }
      \`\`\`
    `,
    indexes: [],
  },
];

it.each(cases)(
  'should generate markdown (%j)',
  ({ indexes, expectedMarkdown }) => {
    // Given
    const diagram = stripIndent`
    erDiagram

        post {
            id uuid
        }
  `;

    // When
    const markdown = generateMarkdown({ diagram, indexes });

    // Then
    expect(markdown).toEqual(expectedMarkdown + '\n');
  }
);
