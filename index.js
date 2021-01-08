const express = require('express');
const yup = require('yup');
const monk = require('monk');
const cors = require('cors');
const morgan = require('morgan');
const {nanoid} = require('nanoid');

require('dotenv').config();

const {DB_URL, PORT} = process.env;

//DB CONNECTION
const db = monk(DB_URL);
const urls = db.get('urls');
urls.createIndex('slug');

const app = express();

//MiddleWares!!!!
app.use(morgan('tiny'));
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get('/:id', async (req,res) => {
    const { id:slug } = req.params;
    try {
        const redirectUrl = await urls.findOne({slug});
        if(redirectUrl){
            res.redirect(redirectUrl.url);
        }
        res.redirect(`?error=${slug} is not found`);
    } catch (err) {
        res.redirect(`?error=Link is not found`);
    }
    
})

const schema = yup.object().shape({
    slug: yup.string().trim().matches(/[\w\-]/i),
    url: yup.string().trim().url().required()
});

app.post('/url', async (req,res,next) =>{
    let {slug, url} = req.body;
    try {
        await schema.validate({
            slug,
            url
        })
        if(!slug){
            slug = nanoid(6);
        } else {
            const isExist = await urls.findOne({ slug });
            if(isExist) {
                throw new Error('Slug is in use. 🤦‍♂️');
            }
        }
        slug = slug.toLowerCase();
        const newUrl = {
            url,
            slug,
        }
        const created = await urls.insert(newUrl);
        res.json(created);
    } catch (error) {
        next(error);
    }
})

app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "script-src 'self' https://cdn.jsdelivr.net/npm/vue@2/dist/vue.js")
    next();
})
  

app.use((error, req, res, next) => {
    if(error.status){
        res.status(error.status);
    } else {
        res.status(500);
        
    }
    res.json({
        message: error.message,
        stack: process.env.NODE_ENV == 'production'  ? '❤' : error.stack,
    })
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Port is active in ${port}`);
})