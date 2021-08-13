const express = require('express')
const multer  = require('multer')
const path    = require('path')
const fs     = require('fs')
const OAuth2Data = require('./credentials.json')
const async      = require('async')

const {google}   = require('googleapis')

const app = express()
app.use(express.static(path.join(__dirname,"/public")))
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
        cb(null,file.originalname+'-'+Date.now()+path.extname(file.originalname))
    }
})

var upload = multer({ storage: storage })

var uploadMultiple = upload.fields([{name: 'file1', maxCount: 10}])
var folderId = '1e6LO-kFNEcfTVyuIdtK-UFXQLAti4wyX'
app.post("/uploads", uploadMultiple,(req,res) =>{
    try{
          const files = req.files
        //creating a folder in root folder
            const drive = google.drive({ version: "v3", auth: oAuth2Client})
                //checking for the presence of a folder
                    var pageToken = null;
                    // Using the NPM module 'async'
                    
                    drive.files.list({
                        q: "mimeType = 'application/vnd.google-apps.folder' and parents in '1e6LO-kFNEcfTVyuIdtK-UFXQLAti4wyX'" ,      
                        fields: 'nextPageToken, files(id, name)',
                        spaces: 'drive'
                    }, function (err, response) {
                        if (err) {
                            // Handle error
                            console.error(err)
                        } else {
                                var flag = false
                                response.data.files.forEach(function(file){
                                    console.log(file)
                                    if (file.name === req.body.id)
                                        {
                                            flag = true
                                            console.log("Found")
                                        }
                                })

                                if(flag === true)
                                {
                                for (const name in files) {
                                    console.log(files[name])
                                    // if (Object.hasOwnProperty.call(files, name)) 
                                    for(var i in files[name])
                                            {                        
                                                var file = files[name][i]
                                                console.log('File is')
                                                console.log(file)
                                                console.log (file.path)
                                                const fileMetadata = {
                                                    name: file.filename,
                                                    parents: [response.data.files[0].id]
                                                }
                                                const media = {
                                                    mimeType: file.minetype,
                                                    body: fs.createReadStream(file.path),
                                                }
                                                    drive.files.create(
                                                    {
                                                        resource: fileMetadata,
                                                        media: media,
                                                        fields: "id"
                                                    }
                                                )
                                                fs.unlinkSync(file.path) 
                                            }
                                }
                            }
                            else{
                                var fileMetadata = {
                                    'name': req.body.id,
                                    'mimeType': 'application/vnd.google-apps.folder',
                                    parents: [folderId]
                                };
                                drive.files.create({
                                    resource: fileMetadata,
                                    fields: 'id'
                                }, function (err, folder) {
                                    if (err) {
                                    // Handle error
                                    console.error(err);
                                    } 
                                    else {
                                        for (const name in files) {
                                            console.log(files[name])
                                            // if (Object.hasOwnProperty.call(files, name)) 
                                            for(var i in files[name])
                                                    {
                                
                                                        var file = files[name][i]
                                                        console.log('File is')
                                                        console.log(file)
                                                        console.log (file.path)
                                                        const fileMetadata = {
                                                            name: file.filename,
                                                            parents: [folder.data.id]
                                                        }
                                                        const media = {
                                                            mimeType: file.minetype,
                                                            body: fs.createReadStream(file.path),
                                                        }
                                                            drive.files.create(
                                                            {
                                                                resource: fileMetadata,
                                                                media: media,
                                                                fields: "id"
                                                            }
                                                        )
                                                        fs.unlinkSync(file.path) 
                                                    }
                                        }
                                    }
                                       
                                });
                            }                            
                        }
                    });    
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