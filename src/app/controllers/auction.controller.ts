import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as auction from '../models/auction.model';
import Ajv, {stringify} from "ajv"

const ajv = new Ajv();

const AuctionRequestSchema = {
    type: "object",
    properties: {
        q: {type: "string"},
        categoryIds: {type: "integer"},
        sellerId: {type: "integer"},
        sortBy: {type: "string"},
        count: {type: "integer"},
        startIndex: {type: "integer"},
        bidderId: {type: "integer"}
    },
    additionalProperties: false
}

function initNum(x: string) {
    let returnVal = null;
    if (!x === undefined) {
        returnVal = parseInt(x as string,10);
    }
    return returnVal;
}

function initString(x: string) {
    let returnVal = null;
    if (!x === undefined) {
        returnVal = x;
    }
    return returnVal;
}

const validate = ajv.compile(AuctionRequestSchema);

const list = async (req: Request, res: Response) : Promise<void> => {
    Logger.http(`GET all auctions`);
    try {
        const valid = validate(req.query);
        Logger.info(req.query);

        if (valid) {
            const categoryIds = initNum(req.query.categoryIds as string);
            const sellerId = initNum(req.query.sellerId as string);
            const count = initNum(req.query.count as string);
            const startIndex = initNum(req.query.startIndex as string);
            const bidderId = initNum(req.query.bidderId as string);

            const q = initString(req.query.q as string);
            const sortBy = initString(req.query.sortBy as string);

            const auctions = await auction.getAll(q,categoryIds, sellerId, sortBy, count, startIndex, bidderId);
            const result = {"count":auctions.length, "auctions":auctions};
            res.status( 200 ).send( result );
        } else {
            res.status(400).send(`ERROR validating auction request`);
        }

    } catch ( err ) {
        res.status( 500 )
            .send( `ERROR getting users ${ err }` );

    }
};

const create = async (req:any, res:any) : Promise<any> => {
    return null;
};

export { list, create }