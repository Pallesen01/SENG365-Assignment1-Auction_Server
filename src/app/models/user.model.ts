import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import {OkPacket, ResultSetHeader, RowDataPacket} from "mysql2";

const create = async (param: User) : Promise<User> => {
    Logger.info(`Adding user ${param.firstName} ${param.lastName} into Database`);
    const createSQL = `INSERT INTO \`user\`(\`email\`, \`first_name\`, \`last_name\`, \`password\`) VALUES ('${param.email}','${param.firstName}','${param.lastName}','${param.password}')`

    try {
        await getPool().query(createSQL);
        const user = await viewDetails(param.email);
        return user[0];
    } catch (e) {
        Logger.error(e);
        return null;
    }

}

const getUser = async (userId: number) : Promise<User[]> => {
    Logger.info(`Getting user ${userId} from the database`);
    const selectSQL = 'SELECT `first_name`, `last_name` FROM `user` WHERE `id` = ' + userId;

    try {
        const user = (await getPool().query(selectSQL))[0];
        if (user) {
            return user;
        } else {
            return null;
        }
    } catch (err) {
        return null;
    }
}


const viewDetails = async (userEmail: string) : Promise<User[]> => {
    Logger.info(`Getting details for user with email: ${userEmail}`);
    const selectSQL = `SELECT \`id\` AS userId, \`email\`, \`first_name\` AS firstName , \`last_name\` AS lastName , \`image_filename\` AS imageFilename , \`password\`, \`auth_token\` AS authToken FROM \`user\` WHERE \`email\` = '${userEmail}'`;

    try {
        const user = (await getPool().query(selectSQL))[0];
        if (user) {
            return user;
        } else {
            Logger.info("User does not exist");
            return null;
        }
    } catch (err) {
        Logger.error(err);
        return null;
    }
}

export { viewDetails, getUser, create }