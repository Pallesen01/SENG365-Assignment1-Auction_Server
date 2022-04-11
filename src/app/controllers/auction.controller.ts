import {NextFunction, Request, Response} from "express";
import Logger from '../../config/logger';
import * as auction from '../models/auction.model';
import Ajv from "ajv"
import {RequestWithUserId} from "../middleware/authenticate.middleware";
import logger from "../../config/logger";
import * as fs from "mz/fs"
import * as user from "../models/user.model";

const ajv = new Ajv();

const AuctionRequestSchema = {
    type: "object",
    properties: {
        q: {type: "string"},
        categoryIds: {type: ["array", "number"]},
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

function initArray(x: string[]) {
    if (x !== undefined) {
        const newArray: number[] = new Array();
        for (const item of x) {
            newArray.push(parseInt(item, 10))
        }
        return newArray
    }
    return null;
}

function isIterable (value: any) {
    return Symbol.iterator in Object(value);
}

const search = async (req: Request, res: Response) : Promise<void> => {
    Logger.info(`GET all auctions`);
    try {
        const valid = validateAuctionRequest(req.query);

        if (valid) {
            let categoryIds
            if (isIterable(req.query.categoryIds)){
                categoryIds = initArray(req.query.categoryIds as string[]);
            } else {
                categoryIds = [initNum(req.query.categoryIds as string)];
            }

            const sellerId = initNum(req.query.sellerId as string);
            const count = initNum(req.query.count as string);
            const startIndex = initNum(req.query.startIndex as string);
            const bidderId = initNum(req.query.bidderId as string);

            const q = initString(req.query.q as string);
            const sortBy = initString(req.query.sortBy as string);

            if (isIterable(categoryIds)) {
                for (const item of categoryIds) {
                    const catList = (await auction.getCategory(item))
                    if (catList.length === 0 && item != null) {
                        res.status( 400 ).send( "Bad Request - Invalid Category" );
                        return null;
                    }
                }
            }

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
    const imageDir = "storage/images/"
    Logger.info(`DELETE auction with id ${req.params.id}`);
    let valid = false;
    if (!isNaN(Number(req.params.id))) {
        valid = true;
    }
    if (valid) {
        const auctionData: Auction = (await auction.getOne(parseInt(req.params.id, 10)))[0];

        if (auctionData === null) {
            logger.info(`Cannot delete auction ${auctionData.auctionId}`);
            res.status(404).send("Auction does not exist");
            next();
            return null;
        }

        // Check that logged in user is the seller for this auction
        if (auctionData.sellerId !== req.authenticatedUserId || auctionData.numBids > 0) {
            logger.info(`Cannot delete auction ${auctionData.auctionId}`);
            res.status(403).send("Forbidden");
            next();
            return null;
        }

        try {
            const prevFilename = await auction.getImageFilename(parseInt(req.params.id, 10));
            if (!prevFilename === null) {
                const filepath = imageDir.concat(prevFilename);
                await fs.unlink(filepath);
            }
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
        const auctionData = (await auction.getOne(parseInt(req.params.id, 10)))[0]
        if (auctionData === null) {
            res.status( 404 ).send(`Auction doesn't exist`)
            return null;
        }

        if (req.authenticatedUserId === auctionData.sellerId) {
            res.status( 403 ).send(`Cannot bid on your own auction`)
            return null;
        }

        if (auctionData.endDate.getTime() < Date.now() ) {
            res.status( 403 ).send(`Auction is closed`)
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
            const filename = await auction.getImageFilename(parseInt(req.params.id, 10));
            if (filename === null) {
                res.status( 404 ).send("No image for this auction");
            } else {
                const filePath = imageDir.concat(filename);
                if (filePath.endsWith('.jpg') || filePath.endsWith('jpeg')) {
                    res.setHeader('content-type', "image/jpeg");
                } else if ((filePath.endsWith('.png'))) {
                    res.setHeader('content-type', "image/png");
                } else if ((filePath.endsWith('.gif'))) {
                    res.setHeader('content-type', "image/gif");
                } else {
                    res.status( 500 ).send("Internal Server Error");
                    return null;
                }
                const imageData = await fs.readFile(filePath);
                res.status( 200 ).send(imageData);
            }

        } catch (e) {
            Logger.error(e);
            res.status( 500 ).send("Internal Server Error");
        }

    }

}

const uploadImage = async (req:RequestWithUserId, res:Response) : Promise<void> => {
    const fileType = req.header("Content-Type");
    const imageDir = "storage/images/"

    if (isNaN(Number(req.params.id))) {
        res.status( 404 ).send("Invalid user");
        return null;
    }


    // Check that id is a number
    if ((fileType !== "image/jpeg" && fileType !== "image/png" && fileType !== "image/gif" )  ) {
        res.status( 400 ).send("Bad Request");
        return null;
    }

    const auctionData: Auction = (await auction.getOne(parseInt(req.params.id, 10)))[0];

    if (!auctionData) {
        res.status(404).send("Auction doesn't exist");
        return null;
    }

    // Check that logged in user is the seller for this auction
    if (auctionData.sellerId !== req.authenticatedUserId) {
        res.status(403).send("Forbidden");
        return null;
    }


    try{
        const filename = `auction_${req.params.id}.${fileType.split("/")[1]}`;
        const filepath = imageDir.concat(filename);

        const prevFilename = await auction.getImageFilename(parseInt(req.params.id, 10));
        req.pipe(fs.createWriteStream(filepath));
        await auction.setImageFilename(parseInt(req.params.id, 10), filename)
        if (prevFilename === null) {
            res.status( 201 ).send("Add auction image");
        } else {
            res.status( 200 ).send("Updated auction image");
        }


    } catch (err) {
        Logger.error(err);
        res.status( 500 ).send("Internal Server Error");
    }

}

export { search, read, create, getCategories, update, deleteAuc, getBids, placeBid, getImage, uploadImage}