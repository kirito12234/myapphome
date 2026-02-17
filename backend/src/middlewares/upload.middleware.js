const fs = require("fs");
const path = require("path");
const multer = require("multer");

const rootUploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "../../uploads");
const courseUploadDir = path.join(rootUploadDir, "courses");
const lessonUploadDir = path.join(rootUploadDir, "lessons");

[rootUploadDir, courseUploadDir, lessonUploadDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const MIME = {
  pdf: ["application/pdf"],
  image: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
  video: ["video/mp4", "video/webm"],
};

const lessonAllowedMimes = [...MIME.pdf, ...MIME.video, ...MIME.image];

const makeStorage = (destination) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, name);
    },
  });

const fileFilterByMimes = (allowedMimes) => (_req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error("Unsupported file type"));
};

const createUpload = ({ destination, allowedMimes, maxSize }) =>
  multer({
    storage: makeStorage(destination),
    fileFilter: fileFilterByMimes(allowedMimes),
    limits: { fileSize: maxSize },
  });

const courseUpload = createUpload({
  destination: courseUploadDir,
  allowedMimes: [...MIME.image, ...MIME.pdf],
  maxSize: 25 * 1024 * 1024,
});

const courseEditUpload = createUpload({
  destination: courseUploadDir,
  allowedMimes: [...MIME.image, ...MIME.pdf],
  maxSize: 25 * 1024 * 1024,
});

const lessonUpload = createUpload({
  destination: lessonUploadDir,
  allowedMimes: lessonAllowedMimes,
  maxSize: 200 * 1024 * 1024,
});

const legacyUpload = createUpload({
  destination: rootUploadDir,
  allowedMimes: [...MIME.image, ...MIME.pdf, ...MIME.video],
  maxSize: 200 * 1024 * 1024,
});

module.exports = legacyUpload;
module.exports.courseUpload = courseUpload;
module.exports.courseEditUpload = courseEditUpload;
module.exports.lessonUpload = lessonUpload;
module.exports.rootUploadDir = rootUploadDir;
