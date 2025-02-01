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
    getUserChannelProfile,
    getWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { formParser } from '../middlewares/multer.middlewares.js';

const router = Router();


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
router.route("/refresh-token").post(refreshAccessToken);
router.route("/changepassword").post(formParser, verifyJWT, changePassword);
router.route("/").get(verifyJWT, getCurrentUser);
router
    .route("/change-avatar")
    .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
    .route("/change-cover-image")
    .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImg);
router
    .route("/update-details")
    .patch(formParser, verifyJWT, updateAccountDetails);

router.route("/channel/:username").get(verifyJWT, getUserChannelProfile);
router.route("/watch-history").get(verifyJWT, getWatchHistory);

export default router;
