#!/usr/bin/env zx

const { prompt } = require("enquirer");

$.verbose = false;

const showHelp = () => {
  echo("Usage:");
  echo(
    "  pg-mermaid [--username=USERNAME --dbname=DBNAME --schema=SCHEMA [OPTION]...]"
  );
  echo("");
  echo("Options:");
  echo(
    "  -h, --host=HOSTNAME             postgres database server host (default: localhost)"
  );
  echo(
    '  -p, --port=PORT                 postgres database server port (default: "5432")'
  );
  echo("  -U, --username=USERNAME         postgres database user name");
  echo(
    "  -d, --dbname=DBNAME             postgres database name to connect to"
  );
  echo("  --schema=SCHEMA");
  echo("  --exclude-tables=TABLE1,TABLE2");
  echo(
    "  --output-path=OUTPUT_PATH       (default: ./entity-relationship-diagram.md)"
  );
};

const runSql = async (command) =>
  await $`
  PGPASSWORD=${password} \
  psql \
    --host=${hostname} \
    --port=${port} \
    --dbname=${databaseName} \
    --username=${username} \
    --csv \
    --tuples-only \
    --quiet \
    --command=${command}
`;

if (argv.help) {
  showHelp();
  process.exit();
}

let isInteractive;

let hostname;
let port;
let username;
let databaseName;
let password;
let schema;
let outputPath;
let selectedTables;
if ((argv.username || argv.U) && (argv.dbname || argv.d) && argv.schema) {
  isInteractive = false;

  hostname = argv.host ?? argv.h ?? "localhost";
  port = argv.port ?? argv.p ?? 5432;
  username = argv.username ?? argv.U;
  databaseName = argv.dbname ?? argv.d;
  schema = argv.schema;
  outputPath = argv["output-path"] ?? "./entity-relationship-diagram.md";

  if (process.env.PGPASSWORD) {
    password = process.env.PGPASSWORD;
  } else {
    ({ password } = await prompt({
      type: "password",
      name: "password",
      message: `Password? (you can use "PGPASSWORD" environment variable)`,
    }));
  }

  const excludeTables = argv["exclude-tables"]?.split(",") ?? [];
  const selectedTablesInCsvFormat = await runSql(`
    select 
      table_name 
    from 
      information_schema.tables
    where 
      table_schema = '${schema}'
      and table_name not in (${
        excludeTables.length === 0
          ? "''"
          : excludeTables.map((table) => `'${table}'`).join(",")
      })
    order by 
      table_name;
  `);
  selectedTables = selectedTablesInCsvFormat.stdout.split("\n").filter(Boolean);
} else if (Object.keys(argv).length === 1 && argv._.length === 0) {
  isInteractive = true;

  ({ hostname, port, username, databaseName, password } = await prompt([
    {
      type: "input",
      name: "hostname",
      message: "Hostname?",
      initial: argv.host ?? argv.h ?? "localhost",
    },
    {
      type: "input",
      name: "port",
      message: "Port?",
      initial: argv.port ?? argv.p ?? 5432,
    },
    {
      type: "input",
      name: "username",
      message: "Username?",
    },
    {
      type: "input",
      name: "databaseName",
      message: "Database name?",
    },
    {
      type: "password",
      name: "password",
      message: `Password?`,
    },
  ]));

  const schemasInCsvFormat = await runSql(`
    select
      schema_name
    from
      information_schema.schemata
    order by 
      schema_name;
  `);
  const schemas = schemasInCsvFormat.stdout.split("\n").filter(Boolean);

  ({ schema } = await prompt({
    type: "autocomplete",
    name: "schema",
    message: "Schema?",
    choices: schemas,
  }));

  const tablesInCsvFormat = await runSql(`
  select 
    table_name 
  from 
    information_schema.tables
  where 
    table_schema = '${schema}'
  order by
    table_name;
`);
  const tables = tablesInCsvFormat.stdout.split("\n").filter(Boolean);

  ({ selectedTables } = await prompt({
    type: "multiselect",
    name: "selectedTables",
    message: "Tables?",
    choices: [...tables].sort(),
    initial: argv["exclude-tables"]
      ? tables.filter((table) => !argv["exclude-tables"].includes(table))
      : tables,
  }));
} else {
  showHelp();
  process.exit(1);
}

const erDiagram = ["erDiagram"];

// Entity
for (const table of selectedTables) {
  erDiagram.push(`    ${table} {`);

  const columnsInCsvFormat = await runSql(`
    select 
      columns.column_name,
      case 
        when columns.data_type='ARRAY' then replace(columns.udt_name, '_', '') || '_array'
        when columns.data_type='USER-DEFINED' then columns.udt_name
        else replace(columns.data_type, ' ', '_') 
      end as data_type,
      -- string_agg(table_constraints.constraint_type, ';'), FIXME: GitHub Flavored Markdown does not support "PK,FK" syntax
      case
        when table_constraints.constraint_type = 'PRIMARY KEY' then 'PK'
        when table_constraints.constraint_type = 'FOREIGN KEY' then 'FK'
      end as constraint_type,
      case
        when columns.is_nullable = 'YES' then 'null'
        when columns.is_nullable = 'NO' then 'not null'
      end as is_nullable
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
      columns.table_schema = '${schema}' 
      and columns.table_name = '${table}'
    /* FIXME: GitHub Flavored Markdown does not support "PK,FK" syntax
      group by
        columns.column_name, columns.udt_name, columns.is_nullable;
    */  
    order by 
      case
        when table_constraints.constraint_type = 'PRIMARY KEY' then 1
        when table_constraints.constraint_type = 'FOREIGN KEY' then 2
        else 3
      end,
      columns.is_nullable, 
      data_type, 
      columns.column_name;
  `);

  const columns = columnsInCsvFormat.stdout
    .split("\n")
    .filter(Boolean)
    .map((column) => {
      const [name, dataType, constraintType, isNullable] = column.split(",");
      return {
        name,
        dataType,
        constraintType,
        isNullable,
      };
    });

  for (const column of columns) {
    erDiagram.push(
      `        ${column.name} ${column.dataType}${
        column.constraintType ? ` ${column.constraintType} ` : " "
      }"${column.isNullable}"`
    );
  }

  erDiagram.push("    }", "");
}

// Relationship
const foreignKeysInCsvFormat = await runSql(`
  select 
    key_column_usage_1.table_name,
    string_agg(distinct key_column_usage_1.column_name, ';'),
    key_column_usage_2.table_name,
    string_agg(distinct key_column_usage_2.column_name, ';')
  from 
    information_schema.referential_constraints
    join information_schema.key_column_usage as key_column_usage_1
      on key_column_usage_1.constraint_schema = referential_constraints.constraint_schema
      and key_column_usage_1.constraint_name = referential_constraints.constraint_name
      and key_column_usage_1.table_name in (${selectedTables
        .map((table) => `'${table}'`)
        .join(", ")})
    join information_schema.key_column_usage as key_column_usage_2
      on key_column_usage_2.constraint_schema = referential_constraints.unique_constraint_schema
      and key_column_usage_2.constraint_name = referential_constraints.unique_constraint_name
      and key_column_usage_2.table_name in (${selectedTables
        .map((table) => `'${table}'`)
        .join(", ")})
  where
    referential_constraints.constraint_schema = '${schema}'
  group by
    key_column_usage_1.constraint_name, key_column_usage_1.table_name, key_column_usage_2.table_name
  order by
    key_column_usage_1.table_name,
    key_column_usage_2.table_name;
`);

const foreignKeys = foreignKeysInCsvFormat.stdout
  .split("\n")
  .filter(Boolean)
  .map((foreignKey) => {
    const [
      childTableName,
      childColumnNames,
      parentTableName,
      parentColumnNames,
    ] = foreignKey.split(",");
    return {
      childTableName,
      childColumnNames: childColumnNames.replaceAll(";", ", "),
      parentTableName,
      parentColumnNames: parentColumnNames.replaceAll(";", ", "),
    };
  });

for (const foreignKey of foreignKeys) {
  const {
    childTableName,
    childColumnNames,
    parentTableName,
    parentColumnNames,
  } = foreignKey;
  erDiagram.push(
    `    ${parentTableName} ||--o{ ${childTableName} : "${childTableName}(${childColumnNames}) -> ${parentTableName}(${parentColumnNames})"`
  );
}

// Indexes
const tableIndexesInCsvFormat = await runSql(`
  select
    tablename, string_agg(indexname, ';')
  from
    pg_indexes
  where
    schemaname = '${schema}'
    and tablename in (${selectedTables.map((table) => `'${table}'`).join(",")})
  group by 
    tablename
  order by 
    tablename;
`);
const tableIndexes = tableIndexesInCsvFormat.stdout
  .split("\n")
  .filter(Boolean)
  .map((tableIndex) => tableIndex.split(","));

const markdown = ["```mermaid", ...erDiagram, "```", "", "### Indexes", ""];
for (const tableIndex of tableIndexes) {
  const [table, indexes] = tableIndex;
  markdown.push(`#### \`${table}\``, "");

  const sortedIndexes = indexes.split(";").sort()
  for (const index of sortedIndexes) {
    markdown.push(`- \`${index}\``);
  }
  
  markdown.push("");
}

// Output
if (!isInteractive) {
  await $`echo ${markdown.join("\n")} > ${outputPath}`;
  echo(`Entity relationship diagram generated at '${outputPath}'.`);
  process.exit();
}

const { choice } = await prompt({
  type: "select",
  name: "choice",
  message: " ",
  choices: [
    "Generate diagram in markdown format (with indexes)",
    "Preview diagram in Mermaid live editor (without indexes)",
  ],
});

switch (choice) {
  case "Preview diagram in Mermaid live editor (without indexes)":
    echo(
      `https://mermaid.live/edit#base64:${btoa(
        JSON.stringify({
          code: erDiagram.join("\n"),
          mermaid: {},
        })
      )}`
    );
    break;
  case "Generate diagram in markdown format (with indexes)":
    const { outputPath } = await prompt({
      type: "input",
      name: "outputPath",
      message: "Path?",
      initial: "./entity-relationship-diagram.md",
    });
    await $`echo ${markdown.join("\n")} > ${outputPath}`;
    echo("Tips! Next time, you can directly run:");

    const tablesInCsvFormat = await runSql(`
      select 
        table_name
      from 
        information_schema.tables
      where 
        table_schema = '${schema}'
      order by 
        table_name;
    `);
    const tables = tablesInCsvFormat.stdout.split("\n").filter(Boolean);
    echo(
      `  ./pg-mermaid.mjs --host=${hostname} --port=${port} --username=${username} --dbname=${databaseName} --schema=${schema} --output-path=${outputPath}${
        selectedTables.length === tables.length
          ? ""
          : ` --exclude-tables=${tables
              .filter((table) => !selectedTables.includes(table))
              .join(",")} `
      }`
    );
    break;
}
