import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import {OkPacket, ResultSetHeader, RowDataPacket} from "mysql2";


const updateDetails = async (userData: User) : Promise<void> => {
    Logger.info(`Updating details for User id: ${userData.userId}`);
    const updateSQL = `UPDATE \`user\` SET \`email\`='${userData.email}',\`first_name\`='${userData.firstName}',\`last_name\`='${userData.lastName}',\`password\`='${userData.password}' WHERE \`id\` = ${userData.userId}`

    await getPool().query(updateSQL);

}

const findUserIdByToken = async (token: string) : Promise<number> => {
    Logger.info(`Finding user in database by token`);
    const selectSQL = `SELECT \`id\` FROM \`user\` WHERE \`auth_token\` = '${token}'`;

    try {
        const user = (await getPool().query(selectSQL))[0][0];
        if (user) {
            return user.id;
        } else {
            Logger.info("User does not exist");
            return null;
        }
    } catch (err) {
        Logger.error(err);
        return null;
    }
}



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

const login = async (userId: number, token: string) : Promise<void> => {
    Logger.info(`Updating token for user ${userId} in Database`);
   const updateSQL = `UPDATE \`user\` SET \`auth_token\`='${token}' WHERE \`id\` = ${userId}`;

    try {
        await getPool().query(updateSQL);
    } catch (e) {
        Logger.error(e);
    }
}

const logout = async (userId: number) : Promise<void> => {
    Logger.info(`Updating token for user ${userId} in Database`);
    const updateSQL = `UPDATE \`user\` SET \`auth_token\`= NULL WHERE \`id\` = ${userId}`;

    try {
        await getPool().query(updateSQL);
    } catch (e) {
        Logger.error(e);
    }
}

const getUser = async (userId: number) : Promise<User[]> => {
    Logger.info(`Getting user ${userId} from the database`);
    const selectSQL = 'SELECT `first_name` AS firstName, `last_name` as lastName, `email` FROM `user` WHERE `id` = ' + userId;

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

const viewAllDetails = async (userId: number) : Promise<User[]> => {
    Logger.info(`Getting all details for user with id: ${userId}`);
    const selectSQL = `SELECT \`id\` AS userId, \`email\`, \`first_name\` AS firstName , \`last_name\` AS lastName , \`image_filename\` AS imageFilename , \`password\`, \`auth_token\` AS authToken FROM \`user\` WHERE \`id\` = ${userId}`;

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

const getImageFilename = async (userId: number) : Promise<string> => {
    Logger.info(`Getting image filename for user ${userId} from database`);
    const conn = await getPool().getConnection();
    const query = `SELECT \`image_filename\` FROM \`user\` WHERE \`id\` = ${userId}; `;
    const [ rows ] = await conn.query(query);
    conn.release();
    return rows[0].image_filename;
}

const setImageFilename = async (userId: number, filename: string) : Promise<void> => {
    Logger.info(`Setting image filename for user ${userId}  to ${filename} in database`);
    const conn = await getPool().getConnection();
    const query = `UPDATE \`user\` SET \`image_filename\`='${filename}' WHERE \`id\` = ${userId}`;
    await conn.query(query);
    conn.release();
}

const removeImage = async (userId: number) : Promise<void> => {
    Logger.info(`Removing image filename for user ${userId} in database`);
    const conn = await getPool().getConnection();
    const query = `UPDATE \`user\` SET \`image_filename\`=NULL WHERE \`id\` = ${userId}`;
    await conn.query(query);
    conn.release();
}

export { viewDetails, getUser, create, login, findUserIdByToken, logout, viewAllDetails, updateDetails, getImageFilename, setImageFilename, removeImage }