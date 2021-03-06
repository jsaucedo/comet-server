"use strict";

/**

 * Module dependencies

 */

var fs        = require("fs");
var path      = require("path");
var Sequelize = require("sequelize");
var env       = process.env.NODE_ENV || "development";
var config    = require(__dirname + '/../config/sequelize.json')[env];

var sequelize = new Sequelize(config.database, config.username, config.password, config);
var db        = {};

 //Prewarming table so it's prepared before first search request
  sequelize.query('SELECT pg_prewarm(\'message_fulltextsearch_idx\')', { type: sequelize.QueryTypes.SELECT})
    .then(function () {
      sequelize.query('SELECT pg_prewarm(\'"Messages"\')', { type: sequelize.QueryTypes.SELECT});
    })
    .catch(function (e) {
      console.error('DB Prewarm Error', e);
    });

fs
  .readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf(".") !== 0) && (file !== "index.js");
  })
  .forEach(function(file) {
    var model = sequelize.import(path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(function(modelName) {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
