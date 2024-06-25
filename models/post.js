const mongoose=require('mongoose');

const postSchema=mongoose.Schema({
    img:Buffer,
    caption:String,
    author:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    },
    likes:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"user"
        }
    ]
});

module.exports=mongoose.model("post",postSchema);