import {Express} from "express";
import {rootUrl} from "./base.routes";
import * as authenticate from "../middleware/authenticate.middleware"

import * as user from '../controllers/user.controller';

module.exports = (app: Express) => {
    app.route(rootUrl + '/users/register')
        .post( user.register );

    app.route(rootUrl + '/users/login')
        .post( user.login );

    app.route(rootUrl + '/users/logout')
        .post( authenticate.loginRequired, user.logout );

    app.route(rootUrl + '/users/:id')
        .get(authenticate.loginOptional, user.get )
        .patch( authenticate.loginRequired, user.modify );
}