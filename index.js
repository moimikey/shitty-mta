#!/usr/bin/env node

"use strict";

var Http  = require('superagent');
var Table = require('ascii-table');

var table;

function fetchStatuses() {
  Http.get('http://www.mta.info/service_status_json')
    .end(function(err, resp) {
    createTable();
    JSON.parse(resp.body).subway.line.forEach(function(line) {
      pushToTable(line);
    });
    process.stdout.write(table.toString());
  });
}

function createTable() {
  table = new Table('Shitty MTA');
  table.setHeading(
    'Line',
    'Service'
  );
}

function pushToTable(line) {
  table.addRow(
    line.name,
    line.status
  );
}

fetchStatuses();
