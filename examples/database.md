> **Note**
>
> Example of a markdown file generated with `pg-mermaid` from a PostgreSQL schema (cf. [schema.sql](schema.sql)).

---

## Diagram

```mermaid
erDiagram

    post {
        id uuid PK "not null"
        author_id uuid FK "not null"
        published boolean "not null"
        title text "not null"
        created_at timestamp_without_time_zone "not null"
    }

    profile {
        id uuid PK "not null"
        user_id uuid FK "not null"
        bio text "not null"
        user_id uuid "not null"
    }

    user {
        id uuid PK "not null"
        email text "not null"
        role role "null"
        name text "null"
    }

    user ||--o{ post : "post(author_id) -> user(id)"
    user ||--o{ profile : "profile(user_id) -> user(id)"
```

## Indexes

### `post`

- `post_created_at_idx`
- `post_pkey`

### `profile`

- `profile_pkey`
- `profile_user_id_key`

### `user`

- `user_email_key`
- `user_pkey`
