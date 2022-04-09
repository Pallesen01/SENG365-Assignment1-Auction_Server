import {Express} from "express";
import {rootUrl} from "./base.routes";

import * as user from '../controllers/user.controller';

// const authenticate = require('../middleware/authenticate.middleware');

module.exports = (app: Express) => {
    app.route(rootUrl + '/users/register')
        .post( user.register );

    /*app.route(rootUrl + '/users/login')
        .post( user.login );*/

    app.route(rootUrl + '/users/:id')
        .get( user.get );
        /*.patch( authenticate.loginRequired, user.modify );*/
}