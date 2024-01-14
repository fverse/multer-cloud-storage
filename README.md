## Multer Custom Storage

This package extends [Multer](https://github.com/expressjs/multer), a Node.js middleware for handling multipart/form-data, to use various cloud storage solutions as custom storage engines. It currently supports IBM Cloud Object Storage (COS), with planned support for AWS S3, Azure Blob Storage, and more.

### Installation

To install the package, run the following command:

```bash
npm install multer-custom-storage
```

### Usage

```javascript
const { CosStorage } = require("multer-custom-storage");

const upload = multer({
  storage: CosStorage({
    // The name of the IBM Cloud Object Storage bucket where files will be stored.
    bucket: "",
    // The endpoint URL for the IBM Cloud Object Storage.
    endpoint: "",
    // The API key for accessing IBM Cloud Object Storage.
    apiKeyId: "",
    // The service instance ID of the IBM Cloud Object Storage.
    serviceInstanceId: "",
  }),
}).array("files");

app.post("/upload", upload, function (req, res) {
  res.json(req.files);
});
```