import { v2 as cloudinary } from "cloudinary";
import { extractPublicId } from "cloudinary-build-url";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRTE, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const responce = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        // console.log("file is uploaded on claudinary ", responce.url);
        fs.unlinkSync(localFilePath);
        return responce;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
};

const deleteOnCloudinary = async (filePath) => {
    const publicId = extractPublicId(filePath);
    console.log(publicId);

    try {
        const res = await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
        });
        if (res.result === "ok") {
            console.log("File deleted successfully");
        } else {
            console.error("Failed to delete the file:", res.result);
        }
    } catch (error) {
        console.error("Error occurred while deleting the file:", error.message);
    }
};

export { uploadOnCloudinary, deleteOnCloudinary };
