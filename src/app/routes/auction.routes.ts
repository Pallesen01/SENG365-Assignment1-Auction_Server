import {Express} from "express";
import {rootUrl} from "./base.routes";

import * as auction from '../controllers/auction.controller';

module.exports = (app: Express) => {

    app.route( rootUrl + '/auctions' )
        .get( auction.list )
        .post ( auction.create );

}