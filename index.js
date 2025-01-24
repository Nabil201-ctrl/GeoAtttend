const bodyParser = require('body-parser');
const express = require('express');
const geolib = require('geolib');
const { default: mongoose } = require('mongoose');

const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.set('veiw engine', 'ejs')
app.use(express.static('public'))


const point1 = {latitude: 40.7128, longitude: -74.0060}
const point2 = {latitude:34.0522, longitude: -118.2437}

const getDistance = geolib.getDistance(point1, point2)
console.log(`the point is between` + getDistance )


app.get('/student',(req,res)=>{
    const { longitude, latitude} = req.body
})
app.listen(3000, ()=>{
    console.log('connected to server:3000')
})