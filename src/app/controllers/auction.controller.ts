import {NextFunction, Request, Response} from "express";
import Logger from '../../config/logger';
import * as auction from '../models/auction.model';
import Ajv from "ajv"
import {RequestWithUserId} from "../middleware/authenticate.middleware";
import logger from "../../config/logger";
import * as fs from "mz/fs"
import * as path from "path";

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

const AuctionCreateSchema = {
    type: "object",
    properties: {
        title: {type: "string"},
        description: {type: "string"},
        reserve: {type: "integer"},
        categoryId: {type: "integer"},
        endDate: {type: "string"},
    },
    required: ["title", "description", "categoryId", "endDate"],
    additionalProperties: false
}

const AuctionUpdateSchema = {
    type: "object",
    properties: {
        title: {type: "string"},
        description: {type: "string"},
        reserve: {type: "integer"},
        categoryId: {type: "integer"},
        endDate: {type: "string"},
    },
    additionalProperties: false
}

const validateAuctionRequest = ajv.compile(AuctionRequestSchema);
const validateCreateAuctionRequest = ajv.compile(AuctionCreateSchema);
const validateUpdateAuctionRequest = ajv.compile(AuctionUpdateSchema);

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

const search = async (req: Request, res: Response) : Promise<void> => {
    Logger.info(`GET all auctions`);
    try {
        const valid = validateAuctionRequest(req.query);

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
    Logger.info(`GET single auction id: ${req.params.id}`);

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
        res.status(400).send(`ERROR validating auction request`);
    }
};

const getCategories = async (req: Request, res: Response) : Promise<void> => {
    Logger.info(`GET all categories`);
    try {
        const result = await auction.getCategories();
        res.status( 200 ).send( result );
    } catch ( err ) {
        res.status( 500 ).send("Error getting all categories")
    }
}

const create = async (req:RequestWithUserId, res:Response, next: NextFunction) : Promise<void> => {
    let valid = validateCreateAuctionRequest(req.body);
    if (valid) {
        const auctionData: Auction = req.body;
        Logger.info(`Creating auction ${auctionData.title}`);
        const aucDate = new Date(auctionData.endDate);
        if ((await auction.getCategory(auctionData.categoryId)).length !== 1 || !aucDate || aucDate.getTime() <= Date.now()) {
            valid = false;
        }
        if (valid) {
            if (auctionData.reserve === undefined) {
                auctionData.reserve = 1;
            }
            auctionData.sellerId = req.authenticatedUserId;

            try {
                const postedAuctionData = await auction.create(auctionData);
                res.status( 201 ).send(postedAuctionData);
            } catch (e) {
                Logger.error(e);
                res.status( 500).send("Internal Server Error");
            }

        }

    } else {
        res.status( 400 ).send("Bad Request")
    }
};

const update = async (req:RequestWithUserId, res:Response, next: NextFunction) : Promise<void> => {
    let valid = validateUpdateAuctionRequest(req.body);

    if (isNaN(Number(req.params.id))) {
        valid = false;
    }

    if (valid) {
        const newAuctionData: Auction = req.body;
        const auctionData = (await auction.getOne(parseInt(req.params.id, 10)))[0];
        if (!auctionData) {
            res.status( 404 ).send("Auction not found");
            next();
            return null;
        }
        if (auctionData.numBids > 0) {
            res.status( 403 ).send("Forbidden");
            next();
            return null;
        }

        Logger.info(`Updating Auction ${newAuctionData.title}`);
        if (newAuctionData.endDate !== undefined) {
            const aucDate = new Date(newAuctionData.endDate);
            if ( !aucDate || aucDate.getTime() <= Date.now()) {
                valid = false;
            }
        }

        if (newAuctionData.categoryId !== undefined && (await auction.getCategory(newAuctionData.categoryId)).length !== 1) {
            valid = false;
        }
        if (valid) {

            if (newAuctionData.title === undefined) {
                newAuctionData.title = auctionData.title;
            }

            if (newAuctionData.description === undefined) {
                newAuctionData.description = auctionData.description;
            }

            if (newAuctionData.categoryId === undefined) {
                newAuctionData.categoryId = auctionData.categoryId;
            }

            if (newAuctionData.endDate === undefined) {
                newAuctionData.endDate = auctionData.endDate;
            }

            if (newAuctionData.reserve === undefined) {
                newAuctionData.reserve = auctionData.reserve;
            }
            newAuctionData.sellerId = req.authenticatedUserId;
            newAuctionData.auctionId = auctionData.auctionId;

            try {
                const postedAuctionData = await auction.update(newAuctionData);
                res.status( 200 ).send(postedAuctionData);
            } catch (e) {
                Logger.error(e);
                res.status( 500).send("Internal Server Error");
            }

        }

    } else {
        res.status( 400 ).send("Bad Request")
        next();
    }
};

const deleteAuc = async (req:RequestWithUserId, res:Response, next: NextFunction) : Promise<void> => {
    Logger.info(`DELETE auction with id ${req.params.id}`);
    let valid = false;
    if (!isNaN(Number(req.params.id))) {
        valid = true;
    }
    if (valid) {
        const auctionData: Auction = (await auction.getOne(parseInt(req.params.id, 10)))[0];
        // Check that logged in user is the seller for this auction
        if (auctionData.sellerId !== req.authenticatedUserId || auctionData.numBids > 0) {
            logger.error(`Cannot delete auction ${auctionData.auctionId}`);
            res.status(403).send("Forbidden");
            next();
            return null;
        }

        try {
            await auction.deleteAuc(auctionData.auctionId);
            res.status(200).send("Auction deleted successfully");
        } catch (e) {
            Logger.error(e);
            res.status(500).send("Internal Server Error");
            next();
        }

    } else {
        res.status(400).send(`ERROR validating auction request`);
    }
};

const getBids = async (req:Request, res:Response) : Promise<void> => {
    let valid = true;

    // Check that id is a number
    if (isNaN(Number(req.params.id))) {
        valid = false;
    }

    if( valid && (await auction.getOne(parseInt(req.params.id, 10))).length !== 1) {
        res.status( 404 ).send(`Auction not found`)
        return null;
    }
    if (valid) {
        Logger.info(`GET all bids for auction ${req.params.id}`);
        try {
            const result = await auction.getBids(parseInt(req.params.id, 10));
            res.status( 200 ).send( result );
        } catch ( err ) {
            res.status( 500 ).send(`Error getting bids for ${req.params.id}`)
        }
    } else {
        res.status(400).send(`ERROR validating bid request`);
    }

}

const placeBid = async (req:RequestWithUserId, res:Response) : Promise<void> => {
    let valid = true;

    if (req.body.amount === undefined) {
        valid = false;
    }

    // Check that id is a number
    if (valid && (isNaN(Number(req.params.id)) || isNaN(Number(req.body.amount)))) {
        valid = false;
    }

    if( valid && (await auction.getOne(parseInt(req.params.id, 10))).length === 0) {
        res.status( 404 ).send(`Auction not found`)
        return null;
    }

    if (valid) {
        if (req.authenticatedUserId === (await auction.getOne(parseInt(req.params.id, 10)))[0].sellerId) {
            res.status( 403 ).send(`Cannot bid on your own auction`)
            return null;
        }

        const prevBids = await auction.getBids(parseInt(req.params.id, 10));
        if (prevBids.length > 0 && prevBids[0].amount >= req.body.amount) {
            res.status( 400 ).send(`Bid too low`);
            return null;
        }


        Logger.info(`User ${req.authenticatedUserId} placing bid on ${req.params.id}`);
        try {
            await auction.placeBid(parseInt(req.params.id, 10), parseInt(req.body.amount, 10), req.authenticatedUserId);
            res.status( 201 ).send( "Bid placed successfully" );
        } catch ( err ) {
            Logger.error(err);
            res.status( 500 ).send(`Error getting bids for ${req.params.id}`)
        }

    } else {
        res.status(400).send(`ERROR validating bid request`);
    }
}

const getImage = async (req:RequestWithUserId, res:Response) : Promise<void> => {
    const imageDir = "storage/images/"
    let valid = true;

    // Check that id is a number
    if (isNaN(Number(req.params.id))) {
        valid = false;
    }

    if( valid && (await auction.getOne(parseInt(req.params.id, 10))).length === 0) {
        res.status( 404 ).send(`Auction not found`)
        return null;
    }

    if (valid) {
        try{
            const filename = await auction.getImagePath(parseInt(req.params.id, 10));
            if (filename === null) {
                res.status( 404 ).send("No image for this auction");
            } else {
                const filePath = imageDir.concat(filename);
                let fileType = path.extname(filePath).replace(".","");
                if (fileType === "jpg") {fileType = "jpeg";}
                const contentType = "image/".concat(fileType)
                const imageData = fs.readFile(filePath);
                Logger.info(filePath);
                Logger.info(fileType);
                res.status( 200 ).header('Content-Type', contentType).send(imageData);
            }

        } catch (e) {
            Logger.error(e);
            res.status( 500 ).send("Internal Server Error");
        }

    }

}

const uploadImage = async (req:RequestWithUserId, res:Response) : Promise<void> => {
    let valid = true;

    // Check that id is a number
    if (isNaN(Number(req.params.id))) {
        valid = false;
    }



    const fileType = req.header("Content-Type");
    // const data = await fs.readFile("storage/images/auction_1.png");
    // const data = await fs.readFile(req.body.toDataURL());
    Logger.info(req.body.toString());
    // await fs.writeFile("storage/images/endmepls.png", req.body, {encoding: "binary"});
    res.status( 201 ).send( "Did a thing" );
    return null;
}

export { search, read, create, getCategories, update, deleteAuc, getBids, placeBid, getImage, uploadImage}