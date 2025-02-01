import { Router } from 'express';
import {
    addComment,
    deleteComment,
    getVideoComments,
    updateComment,
} from "../controllers/comment.controller.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { formParser } from '../middlewares/multer.middlewares.js';
const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/:videoId").get(getVideoComments).post(formParser, addComment);
router.route("/c/:commentId").delete(deleteComment).patch(formParser ,updateComment);

export default router