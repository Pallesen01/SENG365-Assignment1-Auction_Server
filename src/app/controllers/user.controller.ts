import {Request, Response, NextFunction} from "express";
import Logger from '../../config/logger';
import * as user from '../models/user.model';
import * as bcrypt from "bcrypt";
import Ajv from "ajv"

/*const viewDetails = async (req: Request, res: Response) : Promise<void> => {
    try {
        const User = await user.viewDetails(parseInt(req.params.id, 10));
        if (User) {
            res.statusMessage = 'OK';
            res.status(200)
                .json(User);
        } else {
            res.statusMessage = 'Not Found';
            res.status(404)
                .send();
        }
    } catch (err) {
      if (!err.hasBeenLogged) Logger.error(err);
      res.statusMessage = 'Internal Server Error';
      res.status(500)
          .send();
    }
}*/

const ajv = new Ajv();

const RegisterUserRequestSchema = {
    type: "object",
    properties: {
        firstName: {type: "string"},
        lastName: {type: "string"},
        email: {type: "string"},
        password: {type: "string"},
    },
    required: ["firstName", "lastName", "email", "password"],
    additionalProperties: false
}

const validateRegistrationRequest = ajv.compile(RegisterUserRequestSchema);

export const get = async (req: Request, res: Response) : Promise<void> => {
    Logger.http(`GET user id: ${req.params.id}`);

    let valid = false;
    if (!isNaN(Number(req.params.id))) {
        valid = true;
    }
    if (valid) {
        const id = parseInt(req.params.id, 10);
        try {
            const result = await user.getUser(id);
            if (result.length === 0) {
                res.status(404).send('User not found');
            } else {
                res.status(200).send(result[0]);
            }
        } catch (err) {
            res.status(500).send(`ERROR reading User ${id}: ${err}`
            );
        }
    } else {
        res.status(400).send(`ERROR validating user request`);
    }
};

/*const modify = async (req: Request, res: Response) : Promise<void> => {
    return null;
};*/

export const register = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
    let valid = validateRegistrationRequest(req.body)
    const userData: User = req.body;
    if (valid) {
        // Check that email is valid and that password is not of length 0
        if (!userData.email.includes("@") || userData.password.length === 0) {
            valid = false;
        }
    }

    if (valid) {
        Logger.info(req.body);
        const userCheck = await user.viewDetails(userData.email);
        if (userCheck.length === 1) {
            res.status(400).send("Email already in-use");
            next();
        } else {
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            const userObj = await user.create({
                ...userData,
                password: hashedPassword,
            });
            userObj.password = undefined;
            res.status(201).send(userObj);
        }
    } else {
        res.status(400).send("ERROR validating registration request");
        next();
    }

}

/*const loggingIn = async (req: Request, res: Response, next: NextFunction) => {
    const logInData: LogInDto = req.body;
    const user = await this.user.findOne({ email: logInData.email });
    if (user) {
        const isPasswordMatching = await bcrypt.compare(logInData.password, user.password);
        if (isPasswordMatching) {
            user.password = undefined;
            res.send(user);
        } else {
            next();
        }
    } else {
        next();
    }
}*/
