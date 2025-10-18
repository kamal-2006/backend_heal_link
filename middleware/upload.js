const multer = require('multer');
const path = require('path');

// Set storage engine
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    let dest = './uploads/';
    if (file.fieldname === 'profilePhoto') {
      dest += 'profile-photos/';
    } else {
      dest += 'medical-reports/';
    }
    cb(null, dest);
  },
  filename: function(req, file, cb){
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Check file type
function checkFileType(file, cb){
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif|pdf|webp/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if(mimetype && extname){
    return cb(null,true);
  } else {
    cb('Error: Images and PDFs Only!');
  }
}

// for single file upload
const upload = multer({
  storage: storage,
  limits:{fileSize: 1000000}, // 1MB
  fileFilter: function(req, file, cb){
    checkFileType(file, cb);
  }
}).single('profilePhoto');

const uploadSingle = multer({
  storage: storage,
  limits:{fileSize: 1000000}, // 1MB
  fileFilter: function(req, file, cb){
    checkFileType(file, cb);
  }
}).single('report');

// for multiple file upload
const uploadMultiple = multer({
  storage: storage,
  limits:{fileSize: 1000000}, // 1MB
  fileFilter: function(req, file, cb){
    checkFileType(file, cb);
  }
}).array('files', 10);

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err });
  }
  next();
};

module.exports = { upload, uploadSingle, uploadMultiple, handleUploadError };
