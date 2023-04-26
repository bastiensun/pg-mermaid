import { Command, Option } from 'commander';
import { stripIndent } from 'common-tags';
import { z } from 'zod';

const handleCommaSeparatedExcludedTableList = (
  excludedTable: string,
  previousExcludedTables: string[] = []
) => {
  if (excludedTable.includes(',')) {
    const excludedTables = excludedTable.split(',');
    // eslint-disable-next-line no-console
    console.warn(
      `warn: '--excluded-tables' flag with comma-separated list is deprecated, please use space-separated list instead ('--excluded-tables ${excludedTables.join(
        ' '
      )}')`
    );
    return excludedTables;
  }

  return previousExcludedTables.concat([excludedTable]);
};

export const createProgram = (): Command => {
  const program = new Command();

  program
    .requiredOption('-d, --dbname <dbname>', 'database name to connect to')
    .requiredOption(
      '-U, --username <username>',
      'username to connect to the database'
    )
    .addOption(
      new Option('--password <password>')
        .makeOptionMandatory()
        .env('PGPASSWORD')
        .hideHelp()
    )
    .requiredOption(
      '-h, --host <hostname>',
      'host address of the database',
      '127.0.0.1'
    )
    .requiredOption(
      '-p, --port <port>',
      'port number at which the instance is listening',
      '5432'
    )
    .requiredOption('--schema <schema>', 'schema name to generate to', 'public')
    .requiredOption(
      '--output-path <outputPath>',
      'output path to generate to',
      './database.md'
    )
    .option(
      '--excluded-tables <tables...>',
      'tables to exclude',
      handleCommaSeparatedExcludedTableList
    )
    .addHelpText(
      'after',
      '\n' +
        stripIndent`
          Environment variables:
            PGPASSWORD                     password to be used if the server demands password authentication

          Example call:
            $ PGPASSWORD=<password> npx pg-mermaid --dbname <dbname> --username <username>
        `
    );

  return program;
};

type GetOptionsParameters = {
  program?: Command;
};
export const getOptions = ({
  program = createProgram(),
}: GetOptionsParameters = {}) => {
  const OptionsSchema = z.object({
    dbname: z.string(),
    excludedTables: z.union([z.string().array(), z.undefined()]),
    host: z.string(),
    outputPath: z.string(),
    password: z.string(),
    port: z.coerce.number(),
    schema: z.string(),
    username: z.string(),
  });

  return OptionsSchema.parse(program.parse().opts());
};
