# NestJS Mongo Starter Template

This is a template that includes the authentication, authorisation, google-authentication, mailing functionality along with database communication

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository..

## Tech Stack

1. NestJS
2. MongooseODM
3. MongoDB
4. HealthCheck(terminus)
5. Joi
6. Swagger / OpenAPI
7. Mailer Client setup with Pug
8. Authentication (JWT, Passport Local, Oauth2.0)
9. Authorization (RBAC)
10. Throttler Setup
11. Server and security Config
12. Migrations

- All implemented for a generic User Schema
- signup, reset password, forget password etc are implemented too along with 2FA for emails

## Installation

```bash
$ npm install
```

## Pre-Configuration

1. Create your [MailTrap](https://mailtrap.io/) account to receive emails, get smtp username and password
2. Create your Google API Credentials for OAuth2.0 from [Google Developer Console](https://console.cloud.google.com/apis/credentials)
3. Put your preferred Database Credentials in environment file
4. To receive emails with contents, create your preferred templates with styles
5. Have `todohighlight` VsCode extension and execute VsCode command by pressing `Cmd + Shift + P`
   <br/><br/>`TODO-Highlight: List Highlighted Annotations`
6. Select for `FIXME:` annotations, and select which DB connection you prefer. update the same on the respective files

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# staging mode
$ npm run start:staging

# uat mode
$ npm run start:uat

# production mode
$ npm run start:prod
```

## Swagger Docs

[http://localhost:3000/api/](http://localhost:3000/api/)

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Debi Prasad Mishra](https://www.debiprasadmishra.net/)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
