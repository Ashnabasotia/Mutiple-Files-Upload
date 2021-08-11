const express = require('express')
const multer  = require('multer')
const path    = require('path')
const fs=require('fs')
const OAuth2Data = require('./credentials.json')

const {google}   = require('googleapis')

const app = express()

const CLIENT_ID     =     OAuth2Data.web.client_id
const CLIENT_SECRET =     OAuth2Data.web.client_secret
const REDIRECT_URI  =     OAuth2Data.web.redirect_uris[0]

const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
)

var authed = false
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile"
const PORT = process.env.PORT || 5000

app.set("view engine", "ejs")

var storage = multer.diskStorage({
    destination: function(req,file,cb){
        cb(null,'uploads')
    },
    filename: function(req,file,cb){
        cb(null,file.name+'-'+Date.now()+path.extname(file.originalname))
    }
})

var upload = multer({ storage: storage })

var uploadMultiple = upload.fields([ {name: 'file1', maxCount: 10}, {name: 'file2', maxCount: 10 } ])

app.post("/uploads", uploadMultiple , async (req,res) =>{
    try{
        const files = req.files
        console.log(req.files)
        for (const name in files) {
            if (Object.hasOwnProperty.call(files, name)) {
                const file = files[name][0];
                console.log('File is')
                console.log(file)
                const drive = google.drive({ version: "v3", auth: oAuth2Client})
                const fileMetadata = {
                    name: file.filename
                }
                const media = {
                    mimeType: file.minetype,
                    body: fs.createReadStream(file.path),
                }
                const response=await drive.files.create(
                    {
                        resource: fileMetadata,
                        media: media,
                        fields: "id"
                    }
                )
                fs.unlinkSync(file.path)
                //console.log(respone)   
            }
        }
        return res.send('Upload Success')
    }catch(err){
        console.log(err)
        return res.send('Error')
    }            
})


app.get('/', (req,res) => {
    if(!authed){

        var url = oAuth2Client.generateAuthUrl({
            access_type:'offline',
            scope:SCOPES
        })
        console.log(url)
        res.render("index",{url:url})

    }else{
        console.log("User Authenticated")
        res.render("choose")
    }    
})

app.get('/google/callback', (req,res) => {
    const code = req.query.code

    if(code){
        oAuth2Client.getToken(code,function(err,tokens){
            if(err){
                console.log("Error in Authentication")
                console.log(err)
            }
            else{
                console.log("Successfully authenticated")
                console.log(tokens)
                oAuth2Client.setCredentials(tokens)
                authed = true;
                res.redirect('/')
            }
        })
    }
})


app.listen(PORT, () => {
    console.log(`App is Listening on Post ${PORT}`)
})