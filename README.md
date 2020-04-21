# Zenodo upload

Uploads file to Zenodo.

[![npm version](https://badge.fury.io/js/%40iomeg%2Fzenodo-upload.svg)](https://badge.fury.io/js/%40iomeg%2Fzenodo-upload)
[![CI](https://github.com/iomega/zenodo-upload/workflows/CI/badge.svg)](https://github.com/iomega/zenodo-upload/actions?query=workflow%3ACI)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=iomega_zenodo-upload&metric=alert_status)](https://sonarcloud.io/dashboard?id=iomega_zenodo-upload)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=iomega_zenodo-upload&metric=coverage)](https://sonarcloud.io/dashboard?id=iomega_zenodo-upload)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.3726851.svg)](https://doi.org/10.5281/zenodo.3726851)
[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/3805/badge)](https://bestpractices.coreinfrastructure.org/projects/3805)

A JavaScript library to create a new version of a [Zenodo](https://zenodo.org) upload with a file.

Makes a draft copy of an existing Zenodo upload.
After overwriting the file and version the upload is published.

Can be used to create a [DOI](https://doi.org) for a updated data file.
A Zenodo upload must already exist using this library.

[API documentation](https://iomega.github.io/zenodo-upload/modules/_index_.html#).

## Install

```shell
npm install @iomeg/zenodo-upload
```

## Usage

### As a command line tool

```shell
npx --package @iomeg/zenodo-upload zenodo_upload [--sandbox] [--no-checksum] <deposition_id> <file> <version> <access_token>
```

To create new version (`1.2.3`) of [https://zenodo.org/record/1234567](https://zenodo.org/record/1234567) by uploading a local file called `somefile`.

```shell
npx --package @iomeg/zenodo-upload zenodo_upload 1234567 somefile 1.2.3 sometoken
```

The `sometoken` string has to be replaced with a valid [Zenodo access token](https://sandbox.zenodo.org/account/settings/applications/tokens/new/).

### As a library

To create new version of [https://zenodo.org/record/1234567](https://zenodo.org/record/1234567).

Example usage using NodeJS:

```javascript
const fs = require('fs');
const zenodo_upload = require('@iomeg/zenodo-upload').default;

const deposition_id = 1234567;
const filename = 'somefile.txt';
fs.writeFileSync(filename, 'sometext', 'utf8');
const version = '1.2.3';
const access_token = 'sometoken';

zenodo_upload(deposition_id, filename, version, access_token)
    .then(r => console.log(`New zenodo entry ${r.doi} created`))
    .catch(e => console.error(e))
;
```

Or in modern javascript

```javascript
import fs from 'fs';
import zenodo_upload from '@iomeg/zenodo-upload';

const deposition_id = 1234567;
const filename = 'somefile.txt';
await fs.promises.writeFile(filename, 'sometext', 'utf8');
const version = '1.2.3';
const access_token = 'sometoken';

const result = await zenodo_upload(deposition_id, filename, version, access_token);
console.log(`New zenodo entry ${result.doi} created`);
```

To run the example code you will need a valid Zenodo access token and a deposition id that can be written to by that token.

## Development

To install dependencies:

```shell
yarn install
```

To run the project in development/watch mode. Your project will be rebuilt upon changes.

```shell
yarn start
```

To bundle the package to the dist folder.

```shell
yarn build
```

To runs the test watcher (Jest) in an interactive mode. By default, runs tests related to files changed since the last commit.

```shell
yarn test
```

To run linter and fix fixable errors.

```shell
yarn lint --fix
```

## Credits

This project was bootstrapped with [TSDX](https://github.com/jaredpalmer/tsdx).

This project follows the [fair-software-nl](https://fair-software.nl) recommendations.
