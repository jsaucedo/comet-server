"use strict";

/**

 * Module dependencies

 */
var summary_length = 2000;

module.exports = function(sequelize, DataTypes) {
  var Call = sequelize.define("Call", {
    // id autogenerated by sequelize
    summary: { type: DataTypes.STRING(summary_length) },
    startHour: { type: DataTypes.DATE, allowNull: false },
    endHour: { type: DataTypes.DATE, allowNull: false },
    frontendId: { type: DataTypes.STRING(64) }
  }, {
      classMethods:{
        associate: function(models) {
          Call.belongsTo(models.Channel);
          Call.belongsTo(models.User);
          Call.hasMany(models.CallMember, {as: 'Members'});
        },
        summaryLength: function(){
          return summary_length;
        }
      }
  });

  return Call;
};
