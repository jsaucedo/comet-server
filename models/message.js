"use strict";

/**

 * Module dependencies

 */

module.exports = function(sequelize, DataTypes) {
  var Message = sequelize.define("Message", {
    // id autogenerated by sequelize
    content: { type: DataTypes.STRING(500) },
    link: { type: DataTypes.STRING(200) }
  }, {
      classMethods:{
        associate: function(models) {
          Message.belongsTo(models.Channel);
          Message.belongsTo(models.User);
        }
      }
    }
  );

  return Message;
};
