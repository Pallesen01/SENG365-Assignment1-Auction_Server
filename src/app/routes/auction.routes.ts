import {Express} from "express";
import {rootUrl} from "./base.routes";

import * as auction from '../controllers/auction.controller';

module.exports = (app: Express) => {

    app.route( rootUrl + '/auctions' )
        .get( auction.search )
        .post ( auction.create );

    app.route( rootUrl + '/auctions/categories' )
        .get( auction.getCategories );

    app.route( rootUrl + '/auctions/:id' )
        .get( auction.read )
        .post ( auction.create );

}