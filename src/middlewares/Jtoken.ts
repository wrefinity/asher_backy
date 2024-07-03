import * as jwt from "jsonwebtoken";

export class Jtoken {

    private secret: string;

    constructor(secret: string) {
        this.secret = secret;
    }

    async createToken(payload: object): Promise<string> {
        return new Promise((resolve, reject) => {
            jwt.sign(payload, this.secret, { expiresIn:"1h"}, (err, token) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(token as string);
                }
            });
        });
    }
    async decodeToken(token: string): Promise<object | null> {
        return new Promise((resolve, reject) => {
            jwt.verify(token, this.secret, (err, decoded) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(decoded as object);
                }
            });
        });
    }
}
