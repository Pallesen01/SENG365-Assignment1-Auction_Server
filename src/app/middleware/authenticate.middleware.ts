import {NextFunction, Request, Response} from "express";
import Logger from "../../config/logger";

/*exports.loginRequired =  async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
    const token = req.header('X-Authorization');

    try{
        const result = await findUserIdByToken(token);
        if (result === null) {
            res.statusMessage = 'Unauthorized';
            res.status(401)
                .send();
        } else {
            req.authenticatedUserId = result.user_id.toString();
            next();
        }
    } catch (err) {
        if (!err.hasBeenLogged) Logger.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500)
            .send();
    }
}*/