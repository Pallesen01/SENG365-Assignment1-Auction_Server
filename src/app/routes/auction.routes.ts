import {Express} from "express";
import {rootUrl} from "./base.routes";

import * as auction from '../controllers/auction.controller';
import * as authenticate from "../middleware/authenticate.middleware"

module.exports = (app: Express) => {

    app.route( rootUrl + '/auctions' )
        .get( auction.search )
        .post ( authenticate.loginRequired, auction.create );

    app.route( rootUrl + '/auctions/categories' )
        .get( auction.getCategories );

    app.route( rootUrl + '/auctions/:id/bids' )
        .get( auction.getBids )
        .post ( authenticate.loginRequired, auction.placeBid )

    app.route( rootUrl + '/auctions/:id/image' )
        .get ( auction.getImage )
        .put( authenticate.loginRequired, auction.uploadImage);

    app.route( rootUrl + '/auctions/:id' )
        .get( auction.read )
        .patch( authenticate.loginRequired, auction.update )
        .delete( authenticate.loginRequired, auction.deleteAuc );

}