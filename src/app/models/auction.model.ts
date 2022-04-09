import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import {OkPacket, ResultSetHeader, RowDataPacket} from "mysql2";
import {viewDetails} from "./user.model";
import moment from 'moment';

const getAll = async (q: string, categoryIds: number, sellerId: number, sortBy: string, count: number, startIndex: number, bidderId: number) : Promise<Auction[]> => {
    Logger.info("Getting all auctions from the database");
    const conn = await getPool().getConnection();
    let whereClause = "WHERE 1";
    let orderByClause = 'ORDER BY end_date ASC, title ASC';
    let limitClause = "";

    if (q != null) {
        whereClause += " AND title LIKE '%"+ q +"%' OR description LIKE '%"+ q + "%'"
    }

    if (categoryIds != null) {
        whereClause += " AND category_id = " + categoryIds;
    }

    if (sellerId != null) {
        whereClause += " AND seller_id = " + sellerId;
    }

    if (bidderId != null) {
        whereClause += " AND auction_bid.user_id = " + bidderId;
    }

    if (startIndex != null && count != null) {
        limitClause = "LIMIT " + startIndex + ', ' + count;
    } else if (startIndex != null) {
        limitClause = "LIMIT " + startIndex + ', 18446744073709551610';
    } else if (count != null) {
        limitClause = "LIMIT " + count;
    }

    if (sortBy != null) {
        switch (sortBy) {
            case "ALPHABETICAL_ASC":
                orderByClause = "ORDER BY title ASC, description ASC";
                break;
            case "ALPHABETICAL_DESC":
                orderByClause = "ORDER BY title DESC, description DESC";
                break;
            case "CLOSING_SOON":
                orderByClause = "ORDER BY end_date ASC, title ASC";
                break;
            case "CLOSING_LAST":
                orderByClause = "ORDER BY end_date DESC, title ASC";
                break;
            case "BIDS_ASC":
                orderByClause = "ORDER BY numBids ASC, title ASC";
                break;
            case "BIDS_DESC":
                orderByClause = "ORDER BY numBids DESC, title ASC";
                break;
            case "RESERVE_ASC":
                orderByClause = "ORDER BY reserve ASC, title ASC";
                break;
            case "RESERVE_DESC":
                orderByClause = "ORDER BY reserve DESC, title ASC";
                break;
        }

    }


    const query = 'WITH AuctionCounts AS (\n' +
        '    SELECT auction.id, COUNT(auction.id ) AS numBids, MAX(auction_bid.amount) AS highestBid\n' +
        '    FROM `auction`\n' +
        '    INNER JOIN auction_bid ON auction.id=auction_bid.auction_id\n' +
        '    GROUP BY id\n' +
        ')\n' +
        '    \n' +
        'SELECT auction.id as auctionId,`title`,`reserve`,`seller_id` AS sellerId,`category_id` AS categoryId ,user.first_name AS sellerFirstName, user.last_name AS sellerLastName, `end_date` as endDate, IFNULL(AuctionCounts.numBids,0) AS numBids, AuctionCounts.highestBid\n' +
        'FROM `auction`\n' +
        'INNER JOIN `user` ON auction.seller_id=user.id\n' +
        'LEFT JOIN AuctionCounts ON auction.id=AuctionCounts.id\n' +
        'LEFT JOIN auction_bid ON auction.id=auction_bid.auction_id\n' +
        whereClause + '\n' +
        'GROUP BY auction.id\n' +
        orderByClause + '\n' +
        limitClause;

    const [ rows ] = await conn.query( query );
    conn.release();
    return rows;
};

const getOne = async (id: number) : Promise<Auction[]> => {
    Logger.info(`Getting auction ${id} from the database`);
    const conn = await getPool().getConnection();
    const query = 'WITH AuctionCounts AS (\n' +
        '        SELECT auction.id, COUNT(auction.id ) AS numBids, MAX(auction_bid.amount) AS highestBid\n' +
        '        FROM `auction`\n' +
        '        INNER JOIN auction_bid ON auction.id=auction_bid.auction_id\n' +
        '        GROUP BY id\n' +
        '        )\n' +
        '        \n' +
        'SELECT auction.id as auctionId,`title`,`description`,`category_id` AS categoryId,`seller_id` AS sellerId, user.first_name AS sellerFirstName, user.last_name AS sellerLastName,`reserve`, IFNULL(AuctionCounts.numBids,0) AS numBids, AuctionCounts.highestBid, `end_date` as endDate\n' +
        'FROM `auction`\n' +
        ' INNER JOIN `user` ON auction.seller_id=user.id\n' +
        ' LEFT JOIN AuctionCounts ON auction.id=AuctionCounts.id\n' +
        ' LEFT JOIN auction_bid ON auction.id=auction_bid.auction_id\n' +
        ' WHERE auction.id = ' + id + '\n' +
        ' GROUP BY auction.id'
    const [ rows ] = await conn.query(query);
    conn.release();
    return rows;
};

const getMostRecent = async (sellerId: number) : Promise<Auction> => {
    Logger.info(`Getting most recent auction posted by seller ${sellerId} from the database`);
    const conn = await getPool().getConnection();
    const query = `SELECT \`id\` AS auctionId FROM \`auction\` WHERE \`seller_id\` = ${sellerId} ORDER BY \`end_date\` DESC LIMIT 1`;
    const [ rows ] = (await conn.query(query))[0];
    conn.release();
    return rows;
};

const getCategories = async () : Promise<Category[]> => {
    Logger.info(`Getting all categories from the database`);
    const conn = await getPool().getConnection();
    const query = 'SELECT * from category';
    const [ rows ] = await conn.query(query);
    conn.release();
    return rows;
}

const getCategory = async (id: number) : Promise<Category[]> => {
    Logger.info(`Getting category with id ${id} from the database`);
    const conn = await getPool().getConnection();
    const query = `SELECT * from category WHERE \`id\`=${id}`;
    const [ rows ] = await conn.query(query);
    conn.release();
    return rows;
}

const deleteAuc = async (id: number) : Promise<void> => {
    const deleteSQL = 'DELETE FROM `auction` WHERE `id` = ' + id;
    await getPool().query(deleteSQL);
}

const create = async (auctionData: Auction) : Promise<Auction> => {
    Logger.info(`Adding auction ${auctionData.title} into Database`);
    const formattedDate = (moment(auctionData.endDate)).format("YYYY-MM-DD HH:mm:ss");
    const createSQL = `INSERT INTO \`auction\`(\`title\`, \`description\`, \`end_date\`, \`reserve\`, \`seller_id\`, \`category_id\`) VALUES ('${auctionData.title}','${auctionData.description}','${formattedDate}',${auctionData.reserve},${auctionData.sellerId},${auctionData.categoryId})`;


    await getPool().query(createSQL);
    const auctionId = (await getMostRecent(auctionData.sellerId)).auctionId;
    const auction = await getOne(auctionId);
    return auction[0];

    return null;

}


const update = async (auctionData: Auction) : Promise<void> => {
    Logger.info(`Updating details for auction ${auctionData.title}`);
    const formattedDate = (moment(auctionData.endDate)).format("YYYY-MM-DD HH:mm:ss");
    const updateSQL = `UPDATE \`auction\` SET \`title\`='${auctionData.title}',\`description\`='${auctionData.description}',\`end_date\`='${formattedDate}',\`reserve\`=${auctionData.reserve},\`seller_id\`=${auctionData.sellerId},\`category_id\`=${auctionData.categoryId} WHERE \`id\` = ${auctionData.auctionId}`;

    await getPool().query(updateSQL);

}

const getBids = async (auctionId: number) : Promise<Bid[]> => {
    Logger.info(`Getting all bids  for auction with id ${auctionId} from the database`);
    const conn = await getPool().getConnection();
    const query = `SELECT user.id AS bidderId, user.first_name AS firstName, user.last_name AS lastName, \`timestamp\`, \`amount\` FROM \`auction_bid\` LEFT JOIN user ON user.id = user_id WHERE \`auction_id\` = ${auctionId} ORDER BY amount DESC`;
    const [ rows ] = await conn.query(query);
    conn.release();
    return rows;

}

const placeBid = async (auctionId: number, amount: number, bidderId: number) : Promise<void> => {
    Logger.info(`Placing bid of ${amount} on auction ${auctionId} for user ${bidderId}`);
    const formattedDate = (moment(Date.now())).format("YYYY-MM-DD HH:mm:ss");
    const conn = await getPool().getConnection();
    const query = `INSERT INTO \`auction_bid\`(\`auction_id\`, \`user_id\`, \`amount\`, \`timestamp\`) VALUES (${auctionId},${bidderId},${amount},'${formattedDate}')`;
    await conn.query(query);
    conn.release();

}

const getImagePath = async (auctionId: number) : Promise<string> => {
    Logger.info(`Getting image path for auction ${auctionId} from database`);
    const conn = await getPool().getConnection();
    const query = `SELECT \`image_filename\` FROM \`auction\` WHERE \`id\` = ${auctionId}; `;
    const [ rows ] = await conn.query(query);
    conn.release();
    return rows[0].image_filename;
}

export { getAll, getOne, getCategories, deleteAuc, getCategory, create, update, getBids, placeBid, getImagePath }