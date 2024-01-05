import express from "express";
import multer from "multer";
import CosStorage, { cosMultipleUpload, cosSingleUpload } from "./index";

const app = express();

const upload = multer({
  // fileFilter
  storage: CosStorage({
    bucket: "",
    endpoint: "",
    apiKeyId: "",
    serviceInstanceId: "",
  }),
}).single("file");

app.post("/", upload);

app.post(
  "/single",
  cosSingleUpload({
    bucket: "",
    endpoint: "",
    apiKeyId: "",
    serviceInstanceId: "",
  })
);

app.post(
  "/multiple",
  cosMultipleUpload({
    bucket: "",
    endpoint: "",
    apiKeyId: "",
    serviceInstanceId: "",

  })
);

app.listen(5000, () => {
  console.log("Server started on port: 5000");
});
