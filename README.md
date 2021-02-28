# Node.js REST API Template Repository

## Features

- [Node.js](https://nodejs.org/) project
- Uses [expressjs](https://expressjs.com/) as server with
  [routing-controllers](https://github.com/typestack/routing-controllers) to handle the actual requests.
- Database connection to mariadb (can easily be adapted to a different database), using
  [typeorm](https://github.com/typeorm/typeorm) for the object-relational mapping.
- Configured to use (classic) [yarn](https://classic.yarnpkg.com/) as the package manager.
- Pre-configured with [eslint](https://eslint.org/) and [prettier](https://prettier.io/) rules.

## Restrictions on package versions

- `class-transformer` set to exact version 0.3.1 for `routing-controllers`
- `class-validator` set to exact version 0.12.2 for `routing-controllers`
- `typescript` restricted to < 4.2.0 due to the fact that `eslint` complains otherwise
