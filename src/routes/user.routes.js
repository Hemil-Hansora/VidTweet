import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateUserAvatar,
    updateUserCoverImg,
    updateAccountDetails,
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
router.route('/changepassword').post(formParser,verifyJWT,changePassword)
router.route('/').get(verifyJWT,getCurrentUser)
router.route('/change-avatar').post(
    upload.single("avatar"),
    verifyJWT,
    updateUserAvatar
)
router.route('/change-cover-image').post(
    upload.single("coverImage"),
    verifyJWT,
    updateUserCoverImg
)
router.route("/update-details").post(
    formParser,
    verifyJWT,
    updateAccountDetails
)

export default router;
