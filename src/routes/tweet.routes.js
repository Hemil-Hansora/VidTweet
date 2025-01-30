import { Router } from 'express';
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
} from "../controllers/tweet.controller.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import multer from "multer";

const router = Router();
const formParser = multer().none();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(formParser,createTweet);
router.route("/user/:userId").get(getUserTweets);
router.route("/:tweetId").patch(formParser,updateTweet).delete(formParser,deleteTweet);

export default router