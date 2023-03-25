import { z } from 'zod';

export const EntitySchema = z.object({
  attributes: z.array(
    z.object({
      comment: z.union([z.literal('not null'), z.literal('null')]),
      key: z.union([z.literal('PK'), z.literal('FK')]).nullable(),
      name: z.string(),
      type: z.string(),
    })
  ),
  name: z.string(),
});

export type Entity = z.infer<typeof EntitySchema>;

export const RelationshipSchema = z.object({
  child: z.object({
    attributes: z.array(z.string()),
    entity: z.string(),
  }),
  parent: z.object({
    attributes: z.array(z.string()),
    entity: z.string(),
  }),
});

export type Relationship = z.infer<typeof RelationshipSchema>;

export const TableIndexesSchema = z.object({
  indexes: z.array(z.string()),
  name: z.string(),
});

export type TableIndexes = z.infer<typeof TableIndexesSchema>;
