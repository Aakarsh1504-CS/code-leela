const express=require('express');
const app=express();
const path=require('path');
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const cookieparser=require('cookie-parser');
const usm=require('./models/user');
const psm=require('./models/post');
const db=require('./config/dbconnection');
const upload=require('./config/multer-config');
const dotenv=require('dotenv');
const port= process.env.port || 3000;
dotenv.config();

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});
app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"public")));
app.use(cookieparser());


app.get("/",(req,res,next)=>{
    res.cookie("token","");
    res.render("index");
});

app.post("/register",upload.single("image"),async (req,res,next)=>{
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const imgSrcString = `data:${mimeType};base64,${base64Image}`;
    let {username,email,password,age}=req.body;
    let user=await usm.findOne({username});
    let tuser=await usm.findOne({email});
    if(user || tuser) res.redirect("/login");
    else{
        bcrypt.genSalt(10,(err,salt)=>{
            if(err) return next(new Error("Salt Making Error"));
            bcrypt.hash(password,salt,async (err,hash)=>{
                if(err) return next(new Error("Hash Making Error"));
                let cuser=await usm.create({
                    username,
                    email,
                    image:imgSrcString,
                    password:hash,
                    age
                });
                res.redirect("/login");
            });
    })
}
});

app.get("/login",(req,res,next)=>{
    res.cookie("token","");
    res.render("login");
});

app.post("/login",async (req,res,next)=>{
    let {username,password}=req.body;
    let user=await usm.findOne({username});
    if(!user) return res.redirect("/");
    bcrypt.compare(password,user.password,(err,result)=>{
        if(err) return next(new Error("Pass Compairing Error"));
        if(result){
            let token=jwt.sign({email:user.email,id:user._id},process.env.JWT_SECRET);
            res.cookie("token",token,{ httpOnly: true, secure: true, sameSite: 'strict' });
            res.redirect("/profile");
        }
    });
});

app.get("/profile",isLoggedIn,async (req,res,next)=>{
    let posts=await psm.find().populate("author");
    let current=await usm.findOne({_id:req.user.id}).populate("posts");
    let foll=await usm.findOne({_id:req.user.id}).populate("follow");
    res.render("profile",{posts,user:req.user.id,current,foll});
});

app.get("/create",isLoggedIn,(req,res,next)=>{
    res.render("create");
});

app.post("/create",isLoggedIn,upload.single("img"),async (req,res,next)=>{
    let {caption}=req.body;
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const imgSrcString = `data:${mimeType};base64,${base64Image}`;
    let owner=await usm.findOne({_id:req.user.id});
    let cpost=await psm.create({
        img:imgSrcString,
        caption,
        author:req.user.id
    });
    owner.posts.push(cpost._id);
    await owner.save();
    res.redirect("/profile");
});

app.get("/like/:id/:idx",isLoggedIn,async (req,res,next)=>{
    let tbpost=await psm.findOne({_id:req.params.id});
    if(tbpost.likes.indexOf(req.user.id)===-1){
        tbpost.likes.push(req.user.id);
        await tbpost.save();
    }else{
        tbpost.likes.splice(tbpost.likes.indexOf(req.user.id),1);
        await tbpost.save();
    }
    res.redirect(`/profile/#box${req.params.idx}`);
});

app.get("/follow/:id",isLoggedIn,async (req,res,next)=>{
    let creator=await usm.findOne({_id:req.params.id});
    let follower=await usm.findOne({_id:req.user.id});
    if(creator.followers.indexOf(follower._id)===-1){
        creator.followers.push(follower._id);
        await creator.save();
    }
    else{
        creator.followers.splice(creator.followers.indexOf(follower._id),1);
        await creator.save();
    }
    if(follower.follow.indexOf(creator._id)===-1){
        follower.follow.push(creator._id);
        await follower.save();
    }
    else{
        follower.follow.splice(follower.follow.indexOf(creator._id),1);
        await follower.save();
    }
    res.redirect("/profile");
});

app.get("/myposts",isLoggedIn,async (req,res,next)=>{
    let posts=await psm.find();
    let current=await usm.findOne({_id:req.user.id}).populate("posts");
    res.render("mypost",{current,user:req.user.id});
});

app.get("/edit/:id",isLoggedIn,async (req,res,next)=>{
    let epost=await psm.findOne({_id:req.params.id});
    let user=await usm.findOne({_id:req.user.id});
    if(epost.author==req.user.id){
        res.render("edit",{epost,user});
    }else{
        res.redirect("/profile");
    }
});

app.post("/edit/:id",isLoggedIn,async (req,res,next)=>{
    let epost=await psm.findOne({_id:req.params.id});
    let user=await usm.findOne({_id:req.user.id});
    let {caption}=req.body;
    caption+=" (edited)";
    if(epost.author==req.user.id){
        let upost=await psm.findOneAndUpdate({_id:epost._id},{caption},{new:true});
        res.redirect("/profile");
    }else{
        res.redirect("/profile");
    }
});

app.get("/delete/:id/:route",isLoggedIn,async (req,res,next)=>{
    let dpost=await psm.findOne({_id:req.params.id});
    let owner=await usm.findOne({_id:req.user.id});
    if(dpost.author==req.user.id){
        let del=await psm.findOneAndDelete({_id:dpost._id});
        owner.posts.splice(owner.posts.indexOf(del._id),1);
        await owner.save();
        if(req.params.route=="profile") res.redirect("/profile");
        else res.redirect("/myposts");
    }else{
        res.redirect("/profile");
    }
});

app.get("/updatepp",isLoggedIn,async (req,res,next)=>{
    // let user=await usm.finfOne({_id:req.user.id});
    res.render("update");
});

app.post("/update",isLoggedIn,upload.single("newpic"),async (req,res,next)=>{
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const imgSrcString = `data:${mimeType};base64,${base64Image}`;
    let user=await usm.findOne({_id:req.user.id});
    let upuser=await usm.findOneAndUpdate({_id:user._id},{image:imgSrcString},{new:true});
    res.redirect("/profile");
});

function isLoggedIn(req,res,next){
    if(req.cookies.token){
        let data=jwt.verify(req.cookies.token,process.env.JWT_SECRET);
        if(data){
            req.user=data;
            next();
        }
    }else{
        res.redirect("/login");
    }
}

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!')
  });
app.listen(port);
