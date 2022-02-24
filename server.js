const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongo = require('mongodb');
const mongoose = require('mongoose');
require('dotenv').config()
app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));

app.use(({ method, url, query, params, body }, res, next) => {
  console.log('>>> ', method, url);
  console.log(' QUERY:', query);
  console.log(' PRAMS:', params);
  console.log('  BODY:', body);
  const _json = res.json;
  res.json = function(data) {
    console.log(' RESLT:', JSON.stringify(data, null, 2));
    return _json.call(this, data);
  };
  console.log(' ----------------------------');
  next();
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => console.log("Connected to db"));

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})


const SCHEMA = mongoose.Schema;
const ExerciseSchema = new SCHEMA({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String, required: false }
})
const Exercise = mongoose.model('Exercise', ExerciseSchema);

const USERSCHEMA = new SCHEMA({
  username: { type: String, required: true },
  log: [ExerciseSchema]
});
const USER = mongoose.model("USER", USERSCHEMA);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', (req, res) => {
  const NEWUSER = new USER({ username: req.body.username })
  NEWUSER.save((err, data) =>
    res.json({ "username": data.username, "_id": data._id })
  )
});

app.post('/api/users/:_id/exercises', (req, res) => {
  let { description, duration, date } = req.body;
  let _id = req.params._id

  if (date === '' || !date) {
    date = new Date().toDateString();
  }
  else {
    date = new Date(req.body.date).toDateString()
  }

  const NEWEXERCISE = new Exercise({
    description: description,
    duration: parseInt(duration),
    date: date
  });

  USER.findByIdAndUpdate(_id, { $push: { log: NEWEXERCISE } }, { new: true }, (err, data) => {
    if (!err) res.json({ "username": data.username, "description": NEWEXERCISE.description, "duration": parseInt(NEWEXERCISE.duration), "date": NEWEXERCISE.date, "_id": _id });
    else res.send("deu ruim");
  })
})


app.get('/api/users', (req, res) => {
  USER.find({}, (err, data) => res.json(data))
});

app.get('/api/users/:_id/logs', (req, res) => {
  USER.findById(req.params._id, (err, data) => {

    if (req.query.from || req.query.to) {
      let fromDate = (new Date(req.query.from) || new Date(0));
      let toDate = (new Date(req.query.to) || new Date());

      fromDate = fromDate.getTime();
      toDate = toDate.getTime();

      data.log = data.log.filter(EXERCISE => {
        let date = new Date(EXERCISE.date).getTime();
        return (date >= fromDate && date <= toDate)
      })
    };

    if (req.query.limit) {
      data.log = data.log.slice(0, req.query.limit)
    }

    data['count'] = data.log.length
    
    res.json({"username": data.username,"count":data.log.length,"_id":data._id, "log":data.log})
  })
})