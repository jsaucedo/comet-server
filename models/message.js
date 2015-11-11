"use strict";

/**

 * Module dependencies

 */
var content_length = 500;
var link_length = 200;

module.exports = function(sequelize, DataTypes) {
  var Message = sequelize.define("Message", {
    // id autogenerated by sequelize
    content: { type: DataTypes.STRING(content_length) },
    link: { type: DataTypes.STRING(link_length) },
    sentDateTimeUTC: { type: DataTypes.DATE, allowNull: false, defaultValue: new Date() },
  }, {
      classMethods:{
        associate: function(models) {
          Message.belongsTo(models.Channel);
          Message.belongsTo(models.User);
          Message.belongsTo(models.MessageType);
        },
        contentLength: function(){
          return 500;
        }
      },
      indexes:[{
        name: 'message_channel_idx',
        method: 'BTREE',
        fields: ['ChannelId']
      }]
  });

  return Message;
};
