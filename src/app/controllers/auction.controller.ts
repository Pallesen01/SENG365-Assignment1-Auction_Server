import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as auction from '../models/auction.model';

const list = async (req: Request, res: Response) : Promise<void> => {
    Logger.http(`GET all auctions`);
    try {
        const result = await auction.getAll();
        res.status( 200 ).send( result );
    } catch ( err ) {
        res.status( 500 )
            .send( `ERROR getting users ${ err }` );

    }
};

const create = async (req:any, res:any) : Promise<any> => {
    return null;
};

export { list, create }