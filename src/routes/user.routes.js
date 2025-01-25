import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import multer from "multer";

const router = Router();
const formParser = multer().none();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        },
    ]),
    registerUser
);

router.route("/login").post(formParser, loginUser);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route('/refresh-token').post(refreshAccessToken)
    
export default router;
