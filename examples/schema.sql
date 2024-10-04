create type role as enum (
    'admin',
    'user'
);

create table public.user (
    id uuid primary key,
    email text not null unique,
    name text,
    role role
);

create table profile (
    id uuid primary key,
    bio text not null,
    user_id uuid not null unique references public.user (id)
);

create table post (
    id uuid primary key,
    created_at timestamp not null,
    title text not null,
    published boolean not null,
    author_id uuid not null references public.user (id)
);

create index on post (created_at);
