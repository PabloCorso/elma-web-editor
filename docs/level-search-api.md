# Level Search API

This document describes the level search API currently available in this codebase.

## Purpose

Use this endpoint to resolve a level when you know the level file name prefix but do not know the `LevelIndex`.

Example:

- Level file: `mylev.lev`
- Search term: `mylev`

Assumption:

- The level file name prefix matches the stored `LevelName`.

## Endpoint

`GET /api/level`

## Required Query Parameters

- `q`: level name prefix to search for

## Recommended Query Parameters

- `page`: zero-based page index
- `pageSize`: number of results to return

Recommended default request:

```http
GET /api/level?page=0&pageSize=25&q=mylev
```

## Search Behavior

The endpoint performs a prefix search on `LevelName`.

Effective filter:

```sql
LevelName LIKE '<q>%'
```

Examples:

- `q=mylev` matches `mylev`
- `q=mylev` matches `mylev2`
- `q=mylev` matches `mylevelpacktest`

This is not exact-match-only. If multiple rows are returned, prefer an exact `LevelName === "<stripped filename>"` match when available.

## Filename Mapping Rule

When the input is a level filename:

1. Remove the `.lev` extension.
2. Use the remaining prefix as `q`.
3. Call `GET /api/level`.
4. Inspect `rows`.
5. Use the best-matching row's `LevelIndex`.

Example:

```text
mylev.lev -> q=mylev -> GET /api/level?page=0&pageSize=25&q=mylev
```

## Minimal Response Shape

The route returns an object with this top-level shape:

```json
{
  "rows": [
    {
      "LevelIndex": 12345,
      "LevelName": "mylev",
      "LongName": "My Level",
      "Apples": 3,
      "Killers": 0,
      "Added": 1700000000,
      "BattleCount": 0,
      "Besttime": 2512,
      "Mytime": 2600,
      "Tags": [],
      "KuskiData": {
        "Kuski": "author",
        "Country": "fi",
        "KuskiIndex": 10
      }
    }
  ],
  "count": 300000
}
```

Notes:

- `rows` contains the search results.
- `LevelIndex` is the field to use when you need the level identifier.
- `Mytime` is only present for authenticated users.
- `count` is not a true filtered total in this implementation and should not be relied on for exact pagination.

## Prompt-Ready Usage

Use this instruction in prompts:

```text
To resolve a level from a .lev filename when the level id is unknown:

1. Strip the `.lev` extension from the filename.
2. Call `GET /api/level?page=0&pageSize=25&q=<level_name_prefix>`.
3. Read `rows` from the response.
4. Prefer an exact `LevelName` match.
5. Use that row's `LevelIndex` as the level id.

Example:
`mylev.lev` -> `GET /api/level?page=0&pageSize=25&q=mylev`
```

## Optional Query Parameters Supported By The Route

These are accepted by the current implementation but are not needed for the basic filename-to-level lookup flow:

- `order`
- `addedBy`
- `levelPack`
- `tags`
- `excludedTags`
- `finished`
- `battled`
- `finishedBy`

## Implementation References

- Route registration: `src/index.js`
- API mount: `src/api/index.js`
- Search route: `src/api/level.js`
- Prefix filter on `LevelName`: `src/api/level.js`

## Non-Goals

This codebase does not currently expose a dedicated public endpoint that:

- accepts `mylev.lev` directly
- strips the extension for you
- resolves the level by filename plus CRC as a public API

There is internal replay-upload logic that resolves levels using filename prefix plus CRC, but that is not exposed as a standalone public route.
