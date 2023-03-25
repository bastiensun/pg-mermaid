import { type Entity, type Relationship } from './types';

const generateEntity = (entity: Entity) => {
  const mermaid = [`    ${entity.name} {`];

  for (const attribute of entity.attributes) {
    const { comment, key, name, type } = attribute;
    mermaid.push(
      `        ${name} ${type}${key ? ` ${key} ` : ' '}"${comment}"`
    );
  }

  mermaid.push('    }');

  return mermaid.join('\n');
};

const generateEntities = (entities: readonly Entity[]) => {
  const mermaid: string[] = [];

  for (const entity of entities) {
    mermaid.push(generateEntity(entity));
  }

  return mermaid.join('\n\n');
};

const generateRelationships = (relationships: readonly Relationship[]) => {
  const mermaid: string[] = [];

  for (const { child, parent } of relationships) {
    mermaid.push(
      `    ${parent.entity} ||--o{ ${child.entity} : "${
        child.entity
      }(${child.attributes.join(', ')}) -> ${
        parent.entity
      }(${parent.attributes.join(', ')})"`
    );
  }

  return mermaid.join('\n');
};

type GenerateDiagramParameters = {
  entities?: readonly Entity[];
  relationships?: readonly Relationship[];
};
export const generateDiagram = ({
  entities = [],
  relationships = [],
}: GenerateDiagramParameters): string => {
  const diagram = ['erDiagram'];

  if (entities.length > 0) {
    diagram.push(generateEntities(entities));
  }

  if (relationships.length > 0) {
    diagram.push(generateRelationships(relationships));
  }

  return diagram.join('\n\n');
};
