import {NextFunction, Request, Response} from "express";
import Logger from "../../config/logger";
import * as user from '../models/user.model';
import logger from "../../config/logger";
import {info} from "winston";
import {isNull} from "util";

export interface RequestWithUserId extends Request {
    authenticatedUserId: number;
}

export const loginRequired =  async (req: RequestWithUserId, res: Response, next: NextFunction) => {
    const token = req.header('X-Authorization');

    try{
        const result = await user.findUserIdByToken(token);
        if (!result) {
            res.status(401)
                .send("Unauthorized");
        } else {
            req.authenticatedUserId = result;
            next();
        }
    } catch (err) {
        if (!err.hasBeenLogged) Logger.error(err);
        res.status(500)
            .send('Internal Server Error');
    }
}

export const loginOptional =  async (req: RequestWithUserId, res: Response, next: NextFunction) => {
    const token = req.header('X-Authorization');

    try{
        const result = await user.findUserIdByToken(token);
        if (result) {
            req.authenticatedUserId = result;
            next();
        } else {
            next();
        }

    } catch (err) {
        if (!err.hasBeenLogged) Logger.error(err);
        res.status(500)
            .send('Internal Server Error');
    }
}