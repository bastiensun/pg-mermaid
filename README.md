# 🐘 `pg-mermaid`

`Mermaid` diagram generator for `PostgreSQL` database schema.

> **Warning**
>
> Experimental version, work in progress

## Prerequisites

- node (`>=20` LTS)

## Usage

```shell
npx pg-mermaid --help
```

```
Usage: pg-mermaid [options]

Options:
  -d, --dbname <dbname>          database name to connect to
  -U, --username <username>      username to connect to the database
  -h, --host <hostname>          host address of the database (default: "127.0.0.1")
  -p, --port <port>              port number at which the instance is listening (default: "5432")
  --schema <schema>              schema name to generate to (default: "public")
  --output-path <outputPath>     output path to generate to (default: "./database.md")
  --excluded-tables <tables...>  tables to exclude
  --help                         display help for command

Environment variables:
  PGPASSWORD                     password to be used if the server demands password authentication
```

### Example call

```shell
 PGPASSWORD=<password> npx pg-mermaid --dbname <dbname> --username <username>
```

### Example result

cf. [examples/database.md](https://github.com/bastiensun/pg-mermaid/blob/main/examples/database.md)

## Development

### Prerequisites

- pnpm (`>=9`)

### Install dependencies

```shell
pnpm install
```

### Run `pg-mermaid` executable

#### Build to convert TypeScript script in JavaScript then run script with `node`

```shell
pnpm build
node dist/index.js
```

#### Or run TypeScript script directly with `tsx`

```shell
tsx src/index.ts
```

### Run tests

```shell
pnpm test
```
