import { type TableIndexes } from './types';
import { source } from 'common-tags';

type GenerateDiagramSectionParameters = {
  diagram: string;
};
const generateDiagramSection = ({
  diagram,
}: GenerateDiagramSectionParameters): string => {
  return source`
    ## Diagram

    \`\`\`mermaid
    ${diagram}
    \`\`\`
  `;
};

const generateTableIndexesSubSection = ({
  indexes,
  name,
}: TableIndexes): string => {
  const markdown = [`### \`${name}\``, ''];

  for (const index of indexes) {
    markdown.push(`- \`${index}\``);
  }

  return markdown.join('\n');
};

type GenerateIndexesSectionParameters = {
  indexes: readonly TableIndexes[];
};
const generateIndexesSection = ({
  indexes: tables,
}: GenerateIndexesSectionParameters): string => {
  const markdown: string[] = ['## Indexes'];

  for (const { name, indexes } of tables) {
    if (indexes.length > 0) {
      markdown.push(
        generateTableIndexesSubSection({
          indexes,
          name,
        })
      );
    }
  }

  return markdown.join('\n\n');
};

type GenerateMarkdownParameters = {
  diagram: Parameters<typeof generateDiagramSection>[0]['diagram'];
  indexes: readonly TableIndexes[];
};
export const generateMarkdown = ({
  diagram,
  indexes,
}: GenerateMarkdownParameters): string => {
  const markdown = [generateDiagramSection({ diagram })];

  if (indexes.length > 0) {
    markdown.push(generateIndexesSection({ indexes }));
  }

  return markdown.join('\n\n') + '\n';
};
