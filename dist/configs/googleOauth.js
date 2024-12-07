"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleOAuthClient = void 0;
const arctic_1 = require("arctic");
const secrets_1 = require("../secrets");
exports.googleOAuthClient = new arctic_1.Google(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, secrets_1.PUBLIC_URL + 'auth/google/callback');
