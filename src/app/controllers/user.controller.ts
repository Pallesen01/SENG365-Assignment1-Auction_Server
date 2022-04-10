import {Request, Response, NextFunction} from "express";
import Logger from '../../config/logger';
import * as user from '../models/user.model';
import * as bcrypt from "bcrypt";
import Ajv from "ajv"
import * as randtoken from "rand-token"
import {RequestWithUserId} from "../middleware/authenticate.middleware";
import * as fs from "mz/fs";
import {getUser} from "../models/user.model";

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

const ModifyUserRequestSchema = {
    type: "object",
    properties: {
        firstName: {type: "string"},
        lastName: {type: "string"},
        email: {type: "string"},
        currentPassword: {type: "string"},
        password: {type: "string"},
    },
    additionalProperties: false
}

const validateRegistrationRequest = ajv.compile(RegisterUserRequestSchema);
const validateModifyRequest = ajv.compile(ModifyUserRequestSchema);

export const modify = async (req: RequestWithUserId, res: Response, next: NextFunction) : Promise<void> => {
    // Check that user is authorized
    if (parseInt( req.params.id, 10) !== req.authenticatedUserId) {
        res.status(403).send("Forbidden");
        return null;
    }
    Logger.info("Modifying data for user: " + req.authenticatedUserId);
    let valid = validateModifyRequest(req.body)
    const newUserData: User = req.body;
    const userData: User = (await user.viewAllDetails(req.authenticatedUserId))[0];
    if (valid) {
        // Check that email is valid and that password is not of length 0
        if ( (newUserData.email !== undefined && !newUserData.email.includes("@")) || (newUserData.password !== undefined && newUserData.password.length === 0)) {
            valid = false;
        }
    } else if (newUserData.password !== undefined && !(await bcrypt.compare(userData.password, newUserData.currentPassword))) { // Check that password provided is valid
        res.status(401).send("Unauthorized");
        next();
    }

    if (valid) {
        // Check that email is not in use
        const userCheck = await user.viewDetails(newUserData.email);
        if (userCheck.length === 1) {
            res.status(400).send("Email already in-use");
            next();
        }

        // Replace unchanged attributes with original
        newUserData.userId = userData.userId;

        if (newUserData.firstName === undefined) {
            newUserData.firstName = userData.firstName
        }

        if (newUserData.lastName === undefined) {
            newUserData.lastName = userData.lastName
        }

        if (newUserData.email === undefined) {
            newUserData.email = userData.email
        }

        if (newUserData.password === undefined) {
            newUserData.password = userData.password
        } else {
            newUserData.password = await bcrypt.hash(newUserData.password, 10);
        }

        // Put values into database
        try{
            Logger.info(userData);
            Logger.info(newUserData);
            await user.updateDetails(newUserData);
            res.status(200).send("Details updated successfully");
            next();
        } catch (err) {
            Logger.error(err);
            res.status(500).send("Internal server error");
        }

    } else {
        res.status(400).send(`ERROR validating user request`);
    }
}

export const logout = async (req: RequestWithUserId, res: Response) : Promise<void> => {
    Logger.info("Logging out user: " + req.authenticatedUserId);
    try {
        const userData = (await user.getUser(req.authenticatedUserId))[0];
        if (userData) {
            await user.logout(req.authenticatedUserId);
            res.status(200).send("Logged out successfully");
        } else {
            res.status(401).send("Unauthorized");
        }
    } catch {
        res.status(401).send("Unauthorized");
    }
}

export const get = async (req: RequestWithUserId, res: Response) : Promise<void> => {
    Logger.http(`GET user id: ${req.params.id}`);
    Logger.info(req.authenticatedUserId);

    let valid = false;
    if (!isNaN(Number(req.params.id))) {
        valid = true;
    }
    if (valid) {
        const id = parseInt(req.params.id, 10);

        try {
            const result = (await user.getUser(id))[0];

            if (!result) {
                res.status(404).send('User not found');
            } else {
                if (id !== req.authenticatedUserId) {
                    result.email = undefined;
                }
                res.status(200).send(result);
            }
        } catch (err) {
            res.status(500).send(`ERROR reading User ${id}: ${err}`);
        }
    } else {
        res.status(400).send(`ERROR validating user request`);
    }
};

/*const modify = async (req: Request, res: Response) : Promise<void> => {
    return null;
};*/

export const register = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
    Logger.info("Registering new user");
    let valid = validateRegistrationRequest(req.body)
    const userData: User = req.body;
    if (valid) {
        // Check that email is valid and that password is not of length 0
        if (!userData.email.includes("@") || userData.password.length === 0) {
            valid = false;
        }
    }

    if (valid) {
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
            if (userObj) {
                userObj.password = undefined;
                userObj.authToken = undefined;
                res.status(201).send(userObj);
            } else {
                res.status(500).send("Internal server error");
            }

        }
    } else {
        res.status(400).send("ERROR validating registration request");
        next();
    }

}

export const login = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
    Logger.info("User logging in");
    const logInData: User = req.body;
    try {
        const userData = (await user.viewDetails(logInData.email))[0];

        if (userData) {
            const isPasswordMatching = await bcrypt.compare(logInData.password, userData.password);
            if (isPasswordMatching) {
                const genToken = randtoken.generate(32);
                await user.login(userData.userId, genToken);
                const returnData : { userId: number; token: string } = {userId: userData.userId, token: genToken}
                res.status(200).send(returnData);
            } else {
                res.status(400).send("Invalid password");
                next();
            }
        } else {
            res.status(400).send("User does not exist");
            next();
        }
    } catch (e) {
        Logger.error(e);
        res.status(500).send("Internal Server Error");
        next();

    }
}

export const getImage = async (req:RequestWithUserId, res:Response) : Promise<void> => {
    Logger.info(`Getting image for user ${req.authenticatedUserId}`);
    const imageDir = "storage/images/"
    let valid = true;

    // Check that id is a number
    if (isNaN(Number(req.params.id))) {
        valid = false;
    }

    if( valid && (await user.getUser(parseInt(req.params.id, 10))).length === 0) {
        res.status( 404 ).send(`user not found`)
        return null;
    }

    if (valid) {
        try{
            const filename = await user.getImageFilename(parseInt(req.params.id, 10));
            if (filename === null) {
                res.status( 404 ).send("No image for this user");
            } else {
                const filePath = imageDir.concat(filename);
                if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
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

export const uploadImage = async (req:RequestWithUserId, res:Response) : Promise<void> => {
    Logger.info(`Uploading image for user ${req.authenticatedUserId}`);
    const fileType = req.header("Content-Type");
    const imageDir = "storage/images/"
    let valid = true;

    // Check that id is a number
    if (isNaN(Number(req.params.id)) || (fileType !== "image/jpeg" && fileType !== "image/png" && fileType !== "image/gif" )  ) {
        valid = false;
    }

    const userData: User = (await user.viewAllDetails(parseInt(req.params.id, 10)))[0];

    if (!userData) {
        res.status(404).send("User doesn't exist");
        return null;
    }

    // Check that logged in user is the user being edited
    if (userData.userId !== req.authenticatedUserId) {
        Logger.info(`${req.authenticatedUserId}  ${userData.userId}`);
        res.status(403).send("Forbidden");
        return null;
    }

    if (valid) {
        try{
            const filename = `user_${req.params.id}.${fileType.split("/")[1]}`;
            const filepath = imageDir.concat(filename);

            const prevFilename = await user.getImageFilename(parseInt(req.params.id, 10));
            req.pipe(fs.createWriteStream(filepath));
            await user.setImageFilename(parseInt(req.params.id, 10), filename)
            if (prevFilename === null) {
                res.status( 201 ).send("Added user image");
            } else {
                res.status( 200 ).send("Updated user image");
            }


        } catch (err) {
            Logger.error(err);
            res.status( 500 ).send("Internal Server Error");
        }

    } else {
        res.status( 400 ).send("Bad Request");
    }
}

export const deleteImage = async (req:RequestWithUserId, res:Response) : Promise<void> => {
    Logger.info(`Deleting image for user ${req.authenticatedUserId}`);
    const imageDir = "storage/images/"
    let valid = true;

    // Check that id is a number
    if (isNaN(Number(req.params.id))) {
        valid = false;
    }

    const userData: User = (await user.viewAllDetails(parseInt(req.params.id, 10)))[0];

    if (userData.imageFilename === null) {
        res.status(404).send("User has no image");
        return null;
    }

    // Check that logged in user is the user being edited
    if (userData.userId !== req.authenticatedUserId) {
        res.status(403).send("Forbidden");
        return null;
    }

    if (valid) {
        try {
            const prevFilename = await user.getImageFilename(parseInt(req.params.id, 10));
            if (!(prevFilename === null)) {
                const filepath = imageDir.concat(prevFilename);
                await fs.unlink(filepath);
                await user.removeImage(req.authenticatedUserId);
            } else {
                Logger.info("image already doesn't exist");
            }
            res.status( 200 ).send("Image deleted");
        } catch (e) {
            Logger.error(e);
            res.status( 500 ).send("Internal Server Error");
        }


    } else {
        res.status( 400 ).send("Bad Request");
    }
}