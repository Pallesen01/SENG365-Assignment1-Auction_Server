import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import {OkPacket, ResultSetHeader, RowDataPacket} from "mysql2";

const getAll = async () : Promise<Auction[]> => {
    Logger.info("Getting all auctions from the database");
    const conn = await getPool().getConnection();
    const query = 'select * from auction';
    const [ rows ] = await conn.query( query );
    conn.release();
    return rows;
};

const getOne = async (id: number) : Promise<any> => {
    return null;
};

export { getAll, getOne }