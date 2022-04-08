import express from "express";
import bodyParser from "body-parser"
import allowCrossOriginRequestsMiddleware from '../app/middleware/cors.middleware';
import Logger from "./logger";
import {queryParser} from "express-query-parser";

export default () => {
    const app = express();

    // Express query parser
    app.use(queryParser({parseNumber:true}))
    // MIDDLEWARE
    app.use(allowCrossOriginRequestsMiddleware);
    app.use(bodyParser.json());
    app.use(bodyParser.raw({ type: 'text/plain' }));  // for the /executeSql endpoint

    // DEBUG (you can remove these)
    app.use((req, res, next) => {
        Logger.http(`##### ${req.method} ${req.path} #####`);
        next();
    });

    app.get('/', (req, res) =>{
        res.send({ 'message': 'Hello World!' })
    });

    // ROUTES
    require('../app/routes/backdoor.routes')(app);
    require('../app/routes/auction.routes')(app);

    return app;

};
