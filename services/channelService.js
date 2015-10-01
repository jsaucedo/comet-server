"use strict";

/**

 * Module dependencies

 */

var models  = require('../models');

/*
* Create new Channel and and associates project members if provided.
*
* @user
* @project_id
* @channel_name
* @channel_description
* @channel_type
*
*/

module.exports.createChannel = function(user, req, res) {
  user.getProjects({ where: ['"ProjectUser"."ProjectId" = ? AND "Project"."state" != ?', req.primaryParams.project_id, "B"], include: [{ model: models.User}] }).then(function(projects){
    if (projects === undefined || projects.length === 0) {
      return res.status(404).json({ errors: { all: 'No se puede encontrar ningun proyecto con el id provisto.'}});
    }

    if(projects[0].ProjectUser.active === false){
      return res.status(403).json({ errors: { all: 'El usuario no puede acceder al proyecto solicitado.'}});
    } else {
      // create new Channel instance
      var channel = models.Channel.build({
        name: req.body.name,
        description: req.body.description,
        type: req.body.type,
        ProjectId: req.primaryParams.project_id
      });

      channel.save().then(function(channelCreated) {
        user.addChannel(channel, {active: true}).then(function(){
          user.save().then(function() {
            // Channel created successfully

            //associating members if provided
            associateMembers(req.body.members, channel, projects[0].Users, function(){
              //look for members
              channel.getUsers().then(function(users){

                return res.json({
                                  id: channelCreated.id,
                                  name: channelCreated.name,
                                  description: channelCreated.description,
                                  createdAt: channelCreated.createdAt,
                                  type: channelCreated.type,
                                  state: channelCreated.state,
                                  members:  getChannelMembers(users),
                                  integrations: []
                                });
              });
            });
          });
        });
      });
    }
  });
};

/*
* Get Channel information by id
*
* @user
* @req
* @res
*
*/
module.exports.getChannel = function(req, res, user) {
  user.getChannels({ where: ['"ChannelUser"."ChannelId" = ? AND "Channel"."state" != ? AND "Channel"."ProjectId" = ?', req.params.id, "B", req.primaryParams.project_id] }).then(function(channels){
    if (channels === undefined || channels.length === 0) {
      return res.status(404).json({ errors: { all: 'No se puede encontrar ningun canal con el id provisto.'}});
    }

    if(channels[0].ChannelUser.active === false){
      return res.status(403).json({ errors: { all: 'El usuario no puede acceder al canal solicitado.'}});
    } else {

      //look for members
      channels[0].getUsers().then(function(users){

      return res.json({
                        id: channels[0].id,
                        name: channels[0].name,
                        description: channels[0].description,
                        createdAt: channels[0].createdAt,
                        type: channels[0].type,
                        state: channels[0].state,
                        members: getChannelMembers(users),
                        integrations: []
                    });

      });
    }
  });
};

/*
* Get Project's channels information
*
* @user
* @req
* @res
*
*/
module.exports.getChannels = function(req, res, user) {
  var channels_to_be_returned = [];
  user.getChannels({ where: ['"Channel"."state" != ? AND "Channel"."ProjectId" = ?', "B", req.primaryParams.project_id],
                      order: [['createdAt', 'DESC']],
                      include: [{ model: models.User}]}).then(function(channels){
                        //creating response
                        var x;
                        for (x in channels) {
                          //filtering channels user is not assigned anymore

                          if(channels[x].ChannelUser.active === true) {
                              channels_to_be_returned.push({
                                id: channels[x].id,
                                name: channels[x].name,
                                description: channels[x].description,
                                createdAt: channels[x].createdAt,
                                type: channels[x].type,
                                state: channels[x].state,
                                members: getChannelMembers(channels[x].Users),
                                integrations: []
                              });
                          }
                        }

                        return res.json(channels_to_be_returned);
  });
};

/*
*
* Adds new Project's members basing on provided ids.
* @members
* @project_id
* @channel_id
* @user
* @callback
*
*/
module.exports.getAddMembersBulk = function(members, project_id, channel_id, user, callback) {
  var result = {};
  user.getChannels({ where: ['"ChannelUser"."ChannelId" = ? AND "Channel"."state" != ? AND "Channel"."ProjectId" = ?', channel_id, "B", project_id] }).then(function(channels){
    if (channels === undefined || channels.length === 0) {
      result.code = 404;
      result.message = { errors: { all: 'No se puede encontrar ningun canal con el id provisto.'}};
      return callback(result);
    }

    if(channels[0].ChannelUser.active === false){
      result.code = 403;
      result.message = { errors: { all: 'El usuario no puede acceder al canal solicitado.'}};
      return callback(result);
    } else {

      //associating members if provided
      models.Project.findById(project_id, {include: [{ model: models.User}] }).then(function(project){
        associateMembers(members, channels[0], project.Users, function(){
          //look for members
          channels[0].getUsers().then(function(users){

            result.code = 200;
            result.message = {
                              id: channels[0].id,
                              name: channels[0].name,
                              description: channels[0].description,
                              createdAt: channels[0].createdAt,
                              type: channels[0].type,
                              state: channels[0].state,
                              members: getChannelMembers(users),
                              integrations: []
                            };
            return callback(result);
          });
        });
      });
    }
  });
};

/*
*
* Deletes a Project's Channel
* @project_id
* @channel_id
* @user
* @callback
*
*/
module.exports.deleteChannel = function(project_id, channel_id, user, callback) {
  var result = {};
  user.getChannels({ where: ['"ChannelUser"."ChannelId" = ? AND "Channel"."state" != ? AND "Channel"."ProjectId" = ?', channel_id, "B", project_id] }).then(function(channels){
    if (channels === undefined || channels.length === 0) {
      result.code = 404;
      result.message = { errors: { all: 'No se puede encontrar ningun canal con el id provisto.'}};
      return callback(result);
    }

    if(channels[0].ChannelUser.active === false){
      result.code = 403;
      result.message = { errors: { all: 'El usuario no puede acceder al canal solicitado.'}};
      return callback(result);
    } else {
      //deleting channel
      channels[0].block(user.id);
      channels[0].save().then(function(){
        result.code = 200;
        result.message = {};
        return callback(result);
      });
    }
  });
};

/*
* Given a set of Users of a Channel, returns those which are active in a certain format.
* @users
*
*/
function getChannelMembers(users){
  var users_to_be_returned = [];
  var y;
  for (y in users) {
    if(users[y].ChannelUser.active === true){
      users_to_be_returned.push({
                                id: users[y].id,
                                email: users[y].email,
                                profilePicture: users[y].profilePicture,
                                firstName: users[y].firstName,
                                lastName: users[y].lastName,
                                alias: users[y].alias,
                                createdAt:users[y].createdAt
                              });
    }
  }
  return users_to_be_returned;
}

/*
* Given a set of User IDs, associates them to channel if they exist in project
* @members
* @channel
* @project
*
*/
function associateMembers(members, channel, projectUsers, callback){
  if(members){
    var x;
    var project_users_ids = getUsersIds(projectUsers);
    var channel_users_to_create = [];
    for(x in members){
      if(project_users_ids.indexOf(parseInt(members[x].id)) > -1){
        channel_users_to_create.push({ active: 'true', ChannelId: channel.id, UserId: parseInt(members[x].id) });
      }
    }
    models.ChannelUser.bulkCreate(channel_users_to_create).then(function() {
      return true;
    });
  }
  callback();
}

/*
*Given a set of Users, returns an array containing its ids.
*
*/
function getUsersIds(projectUsers){
    var ids_to_be_returned = [];
    if(projectUsers){
      var y;
      for(y in projectUsers){
        ids_to_be_returned.push(projectUsers[y].id);
      }
    }
    return ids_to_be_returned;
}
