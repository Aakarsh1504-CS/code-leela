const mongoose=require('mongoose');


const userSchema=mongoose.Schema({
    username:{
        type:String,
        unique:true
    },
    email:{
        type:String,
        unique:true
    },
    image:String,
    password:String,
    age:Number,
    follow:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"user"
        }
    ],
    followers:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"user"
        }
    ],
    posts:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"post"
        }
    ]
});

module.exports=mongoose.model("user",userSchema);
