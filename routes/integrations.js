"use strict";

/**

* Module dependencies

*/


var jwt = require('express-jwt');
var models  = require('../models');
var express = require('express');
var router  = express.Router();
var integrationsService  = require('../services/integrationsService');
var integrationValidator  = require('../services/validators/integrationValidator');

// saves the unencrypted token in the 'payload' field of request
var auth = jwt({secret: 'mySecretPassword', userProperty: 'payload'});

/*
* Get available Integrations.
* Requires authentication header.
*
*/
router.get('/', auth, function(req, res) {

  //These validations can't be done at integrationsValidator.

  //If these parameters are detected, somebody is requesting for active integrations
  //or a certain project.
  if(req.primaryParams && req.primaryParams.project_id){
    models.User.findById(req.payload._id).then(function(user) {
      if(!user){
        return res.status(404).json({ errors: { all: 'No se encontró usuario asociado al token provisto.'}});
      }
      //look for active integrations of a certain project
      integrationsService.getActiveIntegrationsForProject(req.primaryParams.project_id, user, function(result){
        return res.status(result.code).json(result.message);
      });

    });

  } else {
    //If no parameters are detected, somebody is requesting for all the
    //available integrations at the system.
    integrationsService.getIntegrations(function(result){
      return res.status(result.code).json(result.message);
    });
  }
});

/*
* Update the state of an Integration of a Project.
* Requires authentication header.
* @active
*
*/
router.put('/:id', auth, integrationValidator.validUpdateProjectIntegration, function(req, res) {
  //If these parameters are detected, somebody is requesting to update the state of a certain integration
  //of a certain project.
  if(req.primaryParams && req.primaryParams.project_id){
    models.User.findById(req.payload._id).then(function(user) {
      if(!user){
        return res.status(404).json({ errors: { all: 'No se encontró usuario asociado al token provisto.'}});
      }
      //look for active integrations of a certain project
      integrationsService.updateProjectIntegrationActiveState(req.primaryParams.project_id, req.params.id, user, req.body.active ,function(result){
        return res.status(result.code).json(result.message);
      });
    });
  } else {

      //
      // SYSADMIN COULD BE TRYING TO DISABLE AN INTEGRATION FROM BEING CONFIGURED TO ANY PROJECT AT ALL.
      //
      return res.status(404).json('Requested Operation Not Found');
  }
});

/*
* Get Project Integration by Id.
* Requires authentication header.
*
*/
router.get('/:id', auth, function(req, res) {

    models.User.findById(req.payload._id).then(function(user) {
      if(!user){
        return res.status(404).json({ errors: { all: 'No se encontró usuario asociado al token provisto.'}});
      }
      
      integrationsService.getProjectIntegrationById(req.primaryParams.project_id, req.params.id, user, function(result){
        return res.status(result.code).json(result.message);
      });

    });
});

module.exports = router;