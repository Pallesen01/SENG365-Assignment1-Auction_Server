import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as auction from '../models/auction.model';
import Ajv, {stringify} from "ajv"
import logger from "../../config/logger";

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
    if (x !== undefined) {
        return parseInt(x as string,10);
    }
    return null;
}

function initString(x: string) {
    if (x !== undefined) {
        return x;
    }
    return null;
}

const validateAuctionRequest = ajv.compile(AuctionRequestSchema);

const search = async (req: Request, res: Response) : Promise<void> => {
    Logger.http(`GET all auctions`);
    try {
        const valid = validateAuctionRequest(req.query);
        Logger.info(req.params);

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

const read = async (req: Request, res: Response) : Promise<void> => {
    Logger.http(`GET single auction id: ${req.params.id}`);

    let valid = false;
    if (!isNaN(Number(req.params.id))) {
        valid = true;
    }
    if (valid) {
        const id = parseInt(req.params.id, 10);
        try {
            const result = await auction.getOne(id);
            if (result.length === 0) {
                res.status(404).send('Auction not found');
            } else {
                res.status(200).send(result[0]);
            }
        } catch (err) {
            res.status(500).send(`ERROR reading Auction ${id}: ${err}`
            );
        }
    } else {
        res.status(500).send(`ERROR validating auction request`);
    }
};

const create = async (req:any, res:any) : Promise<any> => {
    return null;
};

export { search, read, create }