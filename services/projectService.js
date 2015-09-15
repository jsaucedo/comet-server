"use strict";

/**

 * Module dependencies

 */

var projectMailerService = require('../services/mailers/projectMailer');
var models  = require('../models');
var validator = require('validator');
var jwt = require('jsonwebtoken');

/*
* Create new Project and send invitations if members provided.
*
* @name
* @description
* @owner
*
*/
module.exports.createProject = function(req, res) {
  models.User.findById(parseInt(req.payload._id)).then(function(user) {
    if(!user){
      return res.status(404).json({ errors: { all: 'No se encontró usuario asociado al token provisto.'}});
    }

    if(user.confirmed){
      // create new Project instance
      var project = models.Project.build({
        name: req.body.name,
        description: req.body.description
      });

      project.save().then(function(projectCreated) {
        user.addProject(project, { isOwner: true });
        user.save().then(function(user) {
          // Project created successfully

          //sending invitations
          sendInvitations(req.body.members, project.name, project.id, user.alias);

          return res.json({
                            id: project.id,
                            name: project.name,
                            description: project.description,
                            createdAt: project.createdAt,
                            isOwner: true,
                            state: project.state,
                            members:  [{
                                        id: user.id,
                                        email: user.email,
                                        profilePicture: user.profilePicture,
                                        alias: user.alias
                                      }],
                            integrations: []
                          });
        });
      });
    } else {
      return res.status(403).json({ errors: { all: 'El usuario debe confirmar su cuenta para llevar adelante la acción solicitada.'}});
    }
  });
};

/*
* Get Project information
*
* @user
* @req
* @res
*
*/
module.exports.getProject = function(req, res, user) {
  user.getProjects({ where: ['"ProjectUser"."ProjectId" = ? AND "Project"."state" != ?', req.params.id, "B"] }).then(function(projects){
    if (projects === undefined || projects.length === 0) {
      return res.status(404).json({ errors: { all: 'No se puede encontrar ningun proyecto con el id provisto.'}});
    }

    if(projects[0].ProjectUser.active === false){
      return res.status(403).json({ errors: { all: 'El usuario no puede acceder al proyecto solicitado.'}});
    } else {

      //look for members
      projects[0].getUsers().then(function(users){

      return res.json({
                        id: projects[0].id,
                        name: projects[0].name,
                        description: projects[0].description,
                        createdAt: projects[0].createdAt,
                        isOwner: projects[0].ProjectUser.isOwner,
                        state: projects[0].state,
                        members: getProjectMemebers(users),
                        integrations: []
                    });

      });
    }
  });
};

/*
* Get all User Project's information
*
* @user
* @req
* @res
*
*/
module.exports.getProjects = function(req, res, user) {
  var projects_to_be_returned = [];
  user.getProjects({ where: ['"Project"."state" != ?', "B"], order: [['createdAt', 'DESC']] ,  include: [{ model: models.User}]}).then(function(projects){
    //creating response
    var x;
    for (x in projects) {
      //filtering projects user is not assigned anymore

      if(projects[x].ProjectUser.active === true) {
          projects_to_be_returned.push({
            id: projects[x].id,
            name: projects[x].name,
            description: projects[x].description,
            createdAt: projects[x].createdAt,
            isOwner: projects[x].ProjectUser.isOwner,
            state: projects[x].state,
            members: getProjectMemebers(projects[x].Users),
            integrations: []
          });
      }
    }

    return res.json(projects_to_be_returned);

  });
};

/*
*
* Sends Project's invitations to provided list of email addresses.
* @user
* @req
* @res
*
*/
module.exports.sendInvitationsBulk = function(req, res, user){
  user.getProjects({ where: ['"ProjectUser"."ProjectId" = ?  AND "Project"."state" != ?', req.params.id, 'B'] }).then(function(projects){
    if (projects === undefined || projects.length === 0) {
      return res.status(404).json({ errors: { all: 'No se puede encontrar ningun proyecto con el id provisto.'}});
    }

    //currently logged user is owner of the project
    if(projects[0].ProjectUser.isOwner == true ){
      //currently logged user is active on the project
        if(projects[0].ProjectUser.active == true){

          //look for already existent members
          projects[0].getUsers({attributes: ['email']}).then(function(members){
            var members_mails = [];
            var x;
            for (x in members) {
              members_mails.push(members[x].email);
            }

            var new_members = [];
            var y;

            //filter emails of already existent memebers
            for (y in req.body.addresses) {
              if(members_mails.indexOf(req.body.addresses[y].address) == -1){
                new_members.push(req.body.addresses[y]);
              }
            }

            //sending invitations
            sendInvitations(new_members, projects[0].name, projects[0].id, user.alias);
            return res.status(200).json({});
          });
        } else {
          return res.status(403).json({ errors: { all: 'El usuario no puede realizar la acción solicitada.'}});
        }
    } else {
      return res.status(403).json({ errors: { all: 'El usuario no puede realizar la acción solicitada.'}});
    }
  });
};

/*
*
* Validate if provided token is associated to currently loged user, and links User to Project.
* @user
* @req
* @res
* @token
*
*/
module.exports.acceptProjectInvitation = function(req, res, user, token){
  //verifying jwt
  jwt.verify(token, 'mySecretPassword', function(err, decoded) {
    if (err) {
      return res.status(400).json({error:{name: err.name, message: err.message}});
      /*
        err = {
          name: 'TokenExpiredError',
          message: 'jwt expired',
          expiredAt: 1408621000
        }
      */
    }

    //evaluating token action
    if(decoded.action === 'accept_project'){
      //validate that provided token is intended for currently logged user.
      if (user.email === decoded.email_address){

        user.getTokens({ where: ['value = ?', token] }).then(function(tokens){
          if (!(tokens === undefined || tokens.length === 0)) {
            return res.status(403).json({ errors: { all: 'El token provisto ya ha sido consumido.'}});
          }

          //retrieving token's project
          models.Project.findById(decoded.project_id).then(function(project){
            //validate that provided project in token exists
            if (!project) {
              return res.status(404).json({ errors: { all: 'No se encontró Proyecto asociado al token provisto.'}});
            }
            //validate that provided token belongs to active project
            if(project.state == 'C' || project.state == 'B'){
              return res.status(404).json({ errors: { all: 'El Proyecto asociado al token provisto no está activo.'}});
            }


          //look for already existent members
          project.getUsers({attributes: ['id']}).then(function(members){

            var members_ids = [];
            var x;
            for (x in members) {
              members_ids.push(members[x].id);
            }

            //checking if currently logged user already belongs to Project
            if(members_ids.indexOf(user.id) == -1){

              //saving token to avoid reusing it
              user.createToken({value: token});

              user.addProject(project, { isOwner: false }).then(function(user) {
                // Project created successfully

                //look for members
                project.getUsers().then(function(users){
                  return res.json({
                                    id: project.id,
                                    name: project.name,
                                    description: project.description,
                                    createdAt: project.createdAt,
                                    isOwner: false,
                                    state: project.state,
                                    members: getProjectMemebers(users),
                                    integrations: []
                                });
                });
              });
            } else {
              return res.status(403).json({ errors: { all: 'El Usuario ya pertenece al Proyecto.'}});
            }
          });
          });
        });

      } else {
        return res.status(403).json({ errors: { all: 'El token provisto no es válido para el Usuario logeado.'}});
      }
    } else {
      return res.status(403).json({ errors: { all: 'El token provisto no fue diseñado para éste propósito.'}});
    }
  });
}

/*
* Generates an expirable project invitation token for provided email.
*
* @email_address
* @project_id
*
*/
function generateProjectInvitationToken(email_address, project_id){
  // expirates in 1 day
  var now = new Date();
  now.setDate(now.getDate() + 1);

  return jwt.sign({
                    project_id: project_id,
                    email_address: email_address,
                    action: 'accept_project',
                    exp: parseInt(now.getTime() / 1000)
                  },
                  'mySecretPassword');
}

/*
*
* Sends emails to provided email addresses
*
* @addresses
*
*/
function sendInvitations(addresses, project_name, project_id, owner_name){
  if(addresses){
    var x;
    for (x in addresses) {
      if(validator.isEmail(addresses[x].address)){
        projectMailerService.sendInvitationEmail(addresses[x].address,
                                                  project_name,
                                                  owner_name,
                                                  generateProjectInvitationToken(addresses[x].address,
                                                                                  project_id)
                                                );
      } else {
        console.log('discarding: ' + addresses[x].address);
      }
    }
  }
}

/*
* Given a set of Users of a Project, returns those which are active in a certain format.
* @users
*
*/
function getProjectMemebers(users){
  var users_to_be_returned = [];
  var y;
  for (y in users) {
    if(users[y].ProjectUser.active === true){
      users_to_be_returned.push({
                                id: users[y].id,
                                email: users[y].email,
                                profilePicture: users[y].profilePicture,
                                alias: users[y].alias
                              });
    }
  }
  return users_to_be_returned;
}