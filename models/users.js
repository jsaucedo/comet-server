"use strict";

/**

 * Module dependencies

 */

var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var avatar = require('avatar-generator')({
                                          //Optional settings. Default settings in 'settings.js'
                                          order:'background face clothes head hair eye mouth'.split(' '), //order in which sprites should be combined
                                          images:'./node_modules/avatar-generator/img', // path to sprites
                                          convert:'convert' //Path to imagemagick convert
                                          });
var fs = require('fs');

var XRegExp = require('xregexp').XRegExp;

module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define("User", {
    // id autogenerated by sequelize
    email: { type: DataTypes.STRING, unique: true, validate: { isEmail: true } },
    hash: { type: DataTypes.STRING },
    salt: { type: DataTypes.STRING },
    lastName: { type: DataTypes.STRING(30) },
    firstName: { type: DataTypes.STRING(20) },
    alias: { type: DataTypes.STRING(50) },
    profilePicture: { type: DataTypes.STRING, allowNull: true },
    confirmed: { type: DataTypes.BOOLEAN, defaultValue: false },
    isAdministrator: { type: DataTypes.BOOLEAN, defaultValue: false },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    severedAt: { type: DataTypes.DATE, allowNull: true },
    searchable_text: {type: DataTypes.STRING(512), allowNull: true}
  }, {
    instanceMethods: {
      setPassword: function(password){
        this.setDataValue('salt', crypto.randomBytes(16).toString('hex'));
        this.setDataValue('hash', crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex'));
      },
      validatePassword: function(password)
      {
           var hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');
           return this.hash === hash;
      },
      generateJWT: function() {
        // expirates in 30 days
        var today = new Date();
        var expiration = new Date(today);
        expiration.setDate(today.getDate() + 30);

        return jwt.sign({
            _id: this.id,
            email: this.email,
            alias: this.alias,
            exp: parseInt(expiration.getTime() / 1000)}, 'mySecretPassword');
      },
      populateUserRecord: function(password)
      {
        //setting password
        this.setPassword(password);

        //setting alias
        this.alias = this.firstName.toLowerCase() + this.lastName.toLowerCase();

        //creating searchable text
        this.searchable_text =
          this.firstName+' '+
          this.lastName+' '+
          this.alias+' '+
          this.email.slice(0,this.email.indexOf('@'));

        var random = Math.random();

        //creating avatar
        avatar(this.alias, 'male', 400).stream().pipe(fs.createWriteStream('./avatar_images/'+ random + this.alias +'avatar.png'));

        //assigning avatar
        this.profilePicture = '/static/'+ random + this.alias + 'avatar.png';

      },
      confirmAccount: function()
      {
        this.confirmed = true;
      },
      closeAccount: function()
      {
        this.active = false;
      },
      reopenAccount: function(password)
      {
        this.active = true;

        //setting password
        this.setPassword(password);
      }
    },
      classMethods:{
        associate: function(models) {
          User.hasMany(models.Token);
          User.belongsToMany(models.Project, { through: models.ProjectUser });
          User.belongsToMany(models.Channel, { through: models.ChannelUser });
        },
        isValidPassword: function(password){
          return XRegExp.test(password, /(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z]).{6,40}/) && password.length > 6 && password.length < 41;
        }
      },
      indexes:[{
        name: 'user_mail_idx',
        method: 'BTREE',
        fields: ['email']
      },{
        name: 'user_fulltextsearch_idx',
        fields: [sequelize.fn('to_tsvector', "spanish", sequelize.literal("searchable_text"))],
        using: 'GIN'
      }]
    }
  );

  return User;
};
