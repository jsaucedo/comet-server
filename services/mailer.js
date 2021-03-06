"use strict";

/**

 * Module dependencies

 */

var nodemailer = require('nodemailer');
var mailer_config = require('../config/mailer.json');
var site_config = require('../config/site_config.json');

var EmailTemplate = require('email-templates').EmailTemplate;
var path = require('path');

var account_confirmation_mailer_template_dir = path.join(__dirname, '..', '/views/templates/account_confirm_email');
var goodbye_mailer_template_dir = path.join(__dirname, '..', '/views/templates/goodbye_email');
var password_recovery_mailer_template_dir = path.join(__dirname, '..', '/views/templates/password_recovery_email');
var account_recovery_mailer_template_dir = path.join(__dirname, '..', '/views/templates/account_recovery_email');
var welcome__and_account_confirmation_mailer_template_dir = path.join(__dirname, '..', '/views/templates/welcome_and_account_confirmation_email');
var winston = require('winston');

/*
* Sends Welcome and account confirmation email to provided email account, with expirable token.
*
* @receiver
* @token
*
*/

module.exports.sendWelcomeAndAccountConfirmationMail = function(receiver, token, fullUrl) {
  var welcome__and_account_confirmation_mailer_template = new EmailTemplate(welcome__and_account_confirmation_mailer_template_dir);

  var locals = {message:{link: fullUrl + '/#/account/confirm?token=' + token}};

  welcome__and_account_confirmation_mailer_template.render(locals, function (err, results) {
    if (err) {
      winston.info(err);
      return err;
    }

    genericMailer(receiver,
                  'Bienvenido a tu nueva cuenta Comet!',
                  results.text,
                  results.html
                );
    });
};

/*
* Sends goodbye mail to provided email account.
*
* @receiver
*
*/
module.exports.sendGoodbyeMail = function(receiver) {
  var goodbye_mailer_template = new EmailTemplate(goodbye_mailer_template_dir);

  var locals = {};

  goodbye_mailer_template.render(locals, function (err, results) {
    if (err) {
      winston.info(err);
      return err;
    }

    genericMailer(receiver,
                  'Nos vemos :(',
                  results.text,
                  results.html
                );
    });
};

/*
* Sends password recovery email with expirable token to provided email account.
*
* @receiver
* @token
*
*/
module.exports.sendPasswordRecoveryMail = function(receiver, token, fullUrl) {
  var password_recovery_mailer_template = new EmailTemplate(password_recovery_mailer_template_dir);

  var locals = {message:{link: fullUrl + '/#/account/recover?token=' + token + '&email=' + receiver}};

  password_recovery_mailer_template.render(locals, function (err, results) {
    if (err) {
      winston.info(err);
      return err;
    }

    genericMailer(receiver,
                  'Recuperacion de Contraseña en Comet',
                  results.text,
                  results.html
                );
    });
};

/*
* Sends account confirmation email with expirable token to provided email account.
*
* @receiver
* @token
*
*/
module.exports.sendAccountConfirmationMail = function(receiver, token, fullUrl) {
  var account_confirmation_mailer_template = new EmailTemplate(account_confirmation_mailer_template_dir);

  var locals = {message:{link: fullUrl + '/#/account/confirm?token=' + token}};

  account_confirmation_mailer_template.render(locals, function (err, results) {
    if (err) {
      winston.info(err);
      return err;
    }

    genericMailer(receiver,
                  'Confirmacion de cuenta Comet',
                  results.text,
                  results.html
                );
  });
};

/*
* Sends account recovery email with expirable token to provided email account.
*
* @receiver
* @token
*
*/
module.exports.sendAccountRecoveryMail = function(receiver, token, fullUrl) {
  var account_recovery_mailer_template = new EmailTemplate(account_recovery_mailer_template_dir);

  var locals = {message:{link: fullUrl + '/#/account/reopen-return?token=' + token + '&email=' + receiver}};

  account_recovery_mailer_template.render(locals, function (err, results) {
    if (err) {
      winston.info(err);
      return err;
    }

    genericMailer(receiver,
                  'Recuperacion de cuenta Comet',
                  results.text,
                  results.html
                );
  });
};

/*
* Sends mail basing on the options retrieved from the mailer_config file (config/mailer.json) and the provided parameters.
* Uses Gmail as email proxy.
*
* @receiver
* @subject
* @text
* @html
*
*/
function genericMailer(receiver, subject, text, html){

    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: mailer_config.user,
            pass: mailer_config.password
        }
    });

    if(site_config.enable_emails === true){
        var mailOptions = {
            from: 'Equipo Comet ✔ <'+mailer_config.user+'>', // sender address
            to: receiver, // list of receivers
            subject: subject, // Subject line
            text: text, // plaintext body
            html: html // html body
        };
        transporter.sendMail(mailOptions, function(error, info){
          if(error){
            return winston.info(error);
          }
          winston.info('Message sent: ' + info.response);
        });
    } else {
      winston.info('Mails not enabled by config file.');
    }
}
