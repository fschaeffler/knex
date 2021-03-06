import Raw from './raw';
import Client from './client';

import makeKnex from './util/make-knex';
import parseConnection from './util/parse-connection';
import fakeClient from './util/fake-client';
import { SUPPORTED_CLIENTS } from './constants';
import { resolveClientNameWithAliases } from './helpers';

if (process.env.KNEX_STATIC_DIALECTS === 1) {
  const mssql = require('knex/lib/dialects/mssql');
  const mysql = require('knex/lib/dialects/mysql');
  const mysql2 = require('knex/lib/dialects/mysql2');
  const oracle = require('knex/lib/dialects/oracle');
  const oracledb = require('knex/lib/dialects/oracledb');
  const postgres = require('knex/lib/dialects/postgres');
  const redshift = require('knex/lib/dialects/redshift');
  const sqlite3 = require('knex/lib/dialects/sqlite3');

  const dialects = {
    mssql,
    mysql,
    mysql2,
    oracle,
    oracledb,
    pg,
    redshift,
    sqlite3,
  };
}

export default function Knex(config) {
  // If config is a string, try to parse it
  if (typeof config === 'string') {
    const parsedConfig = Object.assign(parseConnection(config), arguments[2]);
    return new Knex(parsedConfig);
  }

  let Dialect;
  // If user provided no relevant parameters, use generic client
  if (arguments.length === 0 || (!config.client && !config.dialect)) {
    Dialect = Client;
  }

  // If user provided Client constructor as a parameter, use it
  else if (
    typeof config.client === 'function' &&
    config.client.prototype instanceof Client
  ) {
    Dialect = config.client;
  }

  // If neither applies, let's assume user specified name of a client or dialect as a string
  else {
    const clientName = config.client || config.dialect;
    if (!SUPPORTED_CLIENTS.includes(clientName)) {
      throw new Error(
        `knex: Unknown configuration option 'client' value ${clientName}. Note that it is case-sensitive, check documentation for supported values.`
      );
    }

    const resolvedClientName = resolveClientNameWithAliases(clientName);

    if (process.env.KNEX_STATIC_DIALECTS === 1) {
      Dialect = dialects[resolvedClientName];
    } else {
      Dialect = require(`./dialects/${resolvedClientName}/index.js`);
    }
  }

  // If config connection parameter is passed as string, try to parse it
  if (typeof config.connection === 'string') {
    config = Object.assign({}, config, {
      connection: parseConnection(config.connection).connection,
    });
  }
  const newKnex = makeKnex(new Dialect(config));
  if (config.userParams) {
    newKnex.userParams = config.userParams;
  }
  return newKnex;
}

// Expose Client on the main Knex namespace.
Knex.Client = Client;

/* eslint no-console:0 */

Object.defineProperties(Knex, {
  Promise: {
    get() {
      console.warn(
        `Knex.Promise is deprecated, either require bluebird or use the global Promise`
      );
      return require('bluebird');
    },
  },
});

// Run a "raw" query, though we can't do anything with it other than put
// it in a query statement.
Knex.raw = (sql, bindings) => {
  console.warn(
    'global Knex.raw is deprecated, use knex.raw (chain off an initialized knex object)'
  );
  return new Raw(fakeClient).set(sql, bindings);
};
