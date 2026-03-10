# Get Level API

This document describes the API used to fetch a level directly by its `LevelIndex`.

## Purpose

Use this endpoint when you already know the level id and want the level metadata for that specific level.

Example:

- Known level id: `12345`
- Request: `GET /api/level/12345`

## Endpoint

`GET /api/level/:LevelIndex`

## Path Parameters

- `LevelIndex`: the numeric id of the level to fetch

Example:

```http
GET /api/level/12345
```

## Optional Query Parameters

- `stats`: if truthy, attempts to include `LevelStatsData` and `Tags`

Example:

```http
GET /api/level/12345?stats=1
```

## Response Behavior

The route returns one level object.

If the level is locked, the response is reduced to a limited subset of fields:

- `LevelIndex`
- `LevelName`
- `Locked`
- `Hidden`
- `HardLocked`

If the level is not locked, the route returns the normal level metadata fields.

If `stats` is enabled and the level is eligible, the response may also include:

- `LevelStatsData`
- `Tags`

## Typical Response Shape

```json
{
  "LevelIndex": 12345,
  "LevelName": "mylev",
  "CRC": "abcd1234",
  "LongName": "My Level",
  "Apples": 3,
  "Killers": 0,
  "Flowers": 1,
  "Locked": 0,
  "HardLocked": 0,
  "Hidden": 0,
  "Legacy": 0,
  "AcceptBugs": 1,
  "AddedBy": 10
}
```

Possible extra fields when `stats` is requested:

```json
{
  "LevelStatsData": {
    "TimeF": 100,
    "TimeE": 200,
    "TimeD": 300,
    "TimeAll": 600,
    "AttemptsF": 10,
    "AttemptsE": 20,
    "AttemptsD": 30,
    "AttemptsAll": 60,
    "MaxSpeedF": 9.5,
    "MaxSpeedE": 10.2,
    "MaxSpeedD": 11.1,
    "MaxSpeedAll": 11.1,
    "LeaderCount": 5,
    "UniqueLeaderCount": 4,
    "KuskiCountF": 8,
    "KuskiCountAll": 20
  },
  "Tags": [
    {
      "TagIndex": 1,
      "Tag": "tech"
    }
  ]
}
```

## Prompt-Ready Usage

Use this instruction in prompts:

```text
To fetch a level when the level id is already known, call:

GET /api/level/<LevelIndex>

Example:
GET /api/level/12345

If additional stats are needed, call:
GET /api/level/12345?stats=1

Read the returned JSON object as the level record for that id.
```

## Important Notes

- This endpoint expects a `LevelIndex`, not a level name.
- It returns a single level object, not a paginated `rows` array.
- Locked levels return limited fields only.
- Hidden or locked levels may suppress stats data even when `stats` is requested.

## Implementation References

- Route registration: `src/index.js`
- API mount: `src/api/index.js`
- Route handler: `src/api/level.js`
- Level fetch implementation: `getLevel(LevelIndex, withStats)`
