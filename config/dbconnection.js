const mongoose=require('mongoose');

// mongoose.connect("mongodb://127.0.0.1:27017/insta-test");
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
