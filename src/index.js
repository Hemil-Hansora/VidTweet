import "dotenv/config";

import connectDB from "./db/index.js";
import { app } from "./app.js";

connectDB()
    .then(() => {
        app.on("error", (err) => {
            console.error("Error :", err);
            throw err;
        });

        app.listen(process.env.PORT || 3000, () => {
            console.log(`Server is running at port : ${process.env.PORT}`);
        });
    })
    .catch((err) => {
        console.log("MondoDb connection error !! : ", err);
    });
