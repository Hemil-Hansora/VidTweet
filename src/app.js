import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

//routes import

import userRouter from "./routes/user.routes.js";
import tweetRouter from "./routes/tweet.routes.js"
import videoRouter from "./routes/video.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import commentRouter from "./routes/comment.routes.js"

//routes declaration

app.use("/api/v1/user", userRouter);
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/videos",videoRouter)
app.use("/api/v1/subscription",subscriptionRouter)
app.use("/api/v1/playlist",playlistRouter)
app.use("/api/v1/comment",commentRouter)


export { app };
