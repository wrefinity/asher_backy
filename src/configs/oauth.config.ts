import { OAuth2Client } from "google-auth-library";
import  {GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET} from "../secrets"


export default new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    "postmessage"
);
