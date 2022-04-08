import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import {OkPacket, ResultSetHeader, RowDataPacket} from "mysql2";

const getAll = async (q: string, categoryIds: number, sellerId: number, sortBy: string, count: number, startIndex: number, bidderId: number) : Promise<Auction[]> => {
    Logger.info("Getting all auctions from the database");
    const conn = await getPool().getConnection();
    const query = 'WITH AuctionCounts AS (\n' +
        '    SELECT auction.id, COUNT(auction.id ) AS numBids, MAX(auction_bid.amount) AS highestBid\n' +
        '    FROM `auction`\n' +
        '    INNER JOIN auction_bid ON auction.id=auction_bid.auction_id\n' +
        '    GROUP BY id\n' +
        ')\n' +
        '    \n' +
        'SELECT auction.id as auctionID,`title`,`reserve`,`seller_id` AS sellerID,`category_id` AS categoryID ,user.first_name AS sellerFirstName, user.last_name AS sellerLastName, `end_date` as endDate, IFNULL(AuctionCounts.numBids,0) AS numBids, AuctionCounts.highestBid,0 as highestBid\n' +
        'FROM `auction`\n' +
        'INNER JOIN `user` ON auction.seller_id=user.id\n' +
        'LEFT JOIN AuctionCounts ON auction.id=AuctionCounts.id\n' +
        'GROUP BY auction.id\n' +
        'ORDER BY end_date, category_id';
    const [ rows ] = await conn.query( query );
    conn.release();
    return rows;
};

const getOne = async (id: number) : Promise<any> => {
    return null;
};

export { getAll, getOne }