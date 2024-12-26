var express = require('express');
var http = require('http');
var mongoose = require('mongoose');
var caseMaker = require('./caseMaker');
mongoose.set('useFindAndModify', false);
var fs = require('fs');
var Cookies = require('cookies');
var Chance = require('chance');
var app = express();
var chance = Chance();
var datfile = './data/Scenarios.json';
var structfile = './data/Structure.json';
var desfile = './data/Design.json';
var blankfile = './data/Blanks.json'
var cookie_name = 'survey_cookie';
var dash_cookie = 'dash_cookie';
var dash_passfile = './data/dash_passfile.json';
var HOUR_IN_MS = 60 * 60 * 1000;
var COOKIE_LIFETIME = HOUR_IN_MS * 4;
// var CATCH_TYPE = ['crime', 'crime', 'crime', 'evidence', 'evidence', 'evidence'];
// var CATCH_TYPE = ['evidence', 'evidence', 'evidence', 'evidence', 'evidence', 'evidence'];

// read scenarios from file
// readFileSync is a blocking call, so we won't proceed until the function finishes
var rawdata = fs.readFileSync(datfile);
var data = JSON.parse(rawdata);
var rawstructure = fs.readFileSync(structfile);
var structure = JSON.parse(rawstructure);
var rawdesign = fs.readFileSync(desfile);
var design = JSON.parse(rawdesign);

var NUM_SCENARIOS = design.num_scenarios;
var CATCH_CUTOFF = design['catch_cutoff'];
var CATCH_TYPE = design['catch_type'];
var CATCH_TRIALS = design['catch_trials'];
var SURVEY_LINK = design['survey_link'];
var REINSTRUCT_BEFORE = design.reinstruct_at;
var mongoURL = 'mongodb://localhost/' + design['database'];

// list of uids from previous databases to screen against
var redlist = fs.readFileSync('redlist.txt','utf8').split('\n');

// setup for database
var ScenarioSchema = mongoose.Schema({
    'uid': String,
    'condition': {},
    'text': [{}],
    'completed': Boolean,
    'instructed': Boolean
});

var ClickSchema = mongoose.Schema({
    'uid': String,
    'scenario': Number,
    'question': Number,
    'rating': Number,
    'recall': Number,
    // 'fam': Number,
    'realrate': Number,
    'know': Number,
    // 'rate_punishment': Number,
    'bardguilt': String,
    'mltnguilt': String,
    'subjguilt': String,
    'start': Date,
    'stop': Date
 });

 var CatchSchema = mongoose.Schema({
   'uid': String,
   'choices': [],
   'whichScenNum': [Number],
   'whichCorr': [Number],
   'usrAns': [Number],
   'qType': [String],
 });

var Scenarios = mongoose.model('Scenarios', ScenarioSchema);
var Clicks = mongoose.model('Clicks', ClickSchema);
var Catches = mongoose.model('Catches', CatchSchema);
mongoose.connect(mongoURL, { useNewUrlParser: true });

// // set up analysis engine
// var analysis_client = new zerorpc.Client();
// analysis_client.connect('tcp://127.0.0.1:4242');

// setup for express app
http.createServer(app).listen(3000);
app.use(express.static(__dirname + '/public'));
app.use(Cookies.express());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.get('/', function(req, res) {
    var cc = req.cookies.get(cookie_name);

    // if the cookie already exists, we've already generated scenario data
    // for this user -- forward to main page
    if (cc) {
      var cky = JSON.parse(req.cookies.get(cookie_name));
      if ( (cky.inCorrect >= CATCH_CUTOFF) || (cky.expired) ) {
        res.sendFile(__dirname + '/html/terminate.html')
      } else if (cky.completed) {
        res.redirect('/escape');
      } else if (cky.caught) {
        res.sendFile(__dirname + '/html/catch.html');
      } else if (cky.reinstruct) {
        res.sendFile(__dirname + '/html/reinstruct.html')
      } else if (cky.instructed) {
        res.sendFile(__dirname + '/html/index.html');
      } else {
        res.sendFile(__dirname + '/html/instructions.html');
      }
    } else {
        // if cookie doesn't exist, go ahead to login
        res.redirect('/consent');
    }
});

app.get('/juror', function(req, res) {
  res.sendFile(__dirname + '/html/consent_juror.html')
});

app.get('/consent', function(req, res) {
    var cc = req.cookies.get(cookie_name);

    // if the cookie already exists, we've already generated scenario data
    // for this user -- forward to main page
    if (cc) {
        res.redirect('/');
    } else {
        // if cookie doesn't exist, go ahead to login
        res.sendFile(__dirname + '/html/consent.html');
    }
});

app.get('/login', function(req, res) {
    var cc = req.cookies.get(cookie_name);

    // if the cookie already exists, we've already generated scenario data
    // for this user -- forward to main page
    if (cc) {
        res.redirect('/');
    } else {
        // if cookie doesn't exist, go ahead to login
        res.sendFile(__dirname + '/html/login.html');
    }
});

app.post('/init', function(req, res) {
  var newuid = req.body.uid;
  var cc = req.cookies.get(cookie_name);
  // check whether name is on the redlist
  var reject = redlist.includes(newuid);

  // try finding the uid in the db, if not extant, initialize
  // {$setOnInsert: {'text': out[0], 'completed': false}},
  // {new: true,  // return modified or upserted doc, but not original
  // upsert: true},  // insert doc if it doesn't exist (and $setOnInsert)
  Scenarios.findOne({'uid': newuid}, async function (err, result) {
    if (result===null & !reject) {
      //count number of conditions left in the urn
      var conditions = caseMaker.getCond(design.between);
      var remaining = [];
      for (c of conditions) {
        var filt = {'condition': c, 'completed': true};
        var cdocs = await Scenarios.find(filt);
        remaining.push(design.between.n_per_cell - cdocs.length);
      };

      //sample from urn, or if empty, pick one randomly
      if (remaining.some((x) =>  x > 0)) {
        var asscond = chance.weighted(conditions,remaining);
      } else {
        var asscond = chance.pickone(conditions);
      }
      console.log(remaining)
      console.log(asscond)

      // randomize scenarios and make new database entry
      var out = caseMaker.randomizeScenarios(data, structure, asscond.evidence, NUM_SCENARIOS,
        CATCH_TYPE, CATCH_TRIALS);
      var scenarios = out[0];

      // set trial types for within-subject factors
      if (design.within !== undefined) {
        var trial_types = caseMaker.getWithin(design.within);
        for (i = 0; i < scenarios.length; i++) {
          scenarios[i]['condition'] = trial_types[i];
        }
      }

      var newScene = new Scenarios({
        'uid': newuid,
        'condition': asscond,
        'text': scenarios,
        'completed': false
      });
      newScene.save();

      // save for catch trials
      var newCatch = new Catches({
        'uid': newuid,
        'choices': out[1],
        'whichScenNum': CATCH_TRIALS,
        'whichCorr': out[2],
        'qType': out[3],
        'usrAns': []
      });
      newCatch.save();

      // initialize cookie
      var cky = JSON.stringify({uid: newuid, current: 0, caught: false, inCorrect: 0, instructed: false, reinstruct: false, completed: false});
      res.cookies.set(cookie_name, cky, {maxAge: COOKIE_LIFETIME, httpOnly: true, overwrite: true});
    } else {
      //no database entry matching uid
      // already participated but have no cookie, so probably expired or they are doing something weird
      var cky = JSON.stringify({expired: true})
      res.cookies.set(cookie_name, cky, {maxAge: COOKIE_LIFETIME, httpOnly: true, overwrite: true});
    }

    res.send('/')
  });
});

app.get('/terminateReason', function(req, res) {
  var cky = JSON.parse(req.cookies.get(cookie_name));
  if (cky.inCorrect >= CATCH_CUTOFF) {
    res.send('<p>The task has ended because three attention checks were anwered incorrectly. ' +
      'Thank you for participating.</p>');
  } else if (cky.expired) {
    res.send('<p>Our records show that you have already participated in this survey.</p>');
  } else {
    res.sendStatus(400);
  }
});

app.get('/condition', function(req, res) {
  var cky = JSON.parse(req.cookies.get(cookie_name));
  Scenarios.findOne({'uid': cky.uid}, 'condition', function(err, result) {
    if (result === null) {
      res.sendStatus(500);
    } else {
      res.send(result.condition);
    };
  });
});

app.get('/current', function(req, res) {
    var cc = req.cookies.get(cookie_name);
    var resobj;  // data object to send as response
    var cky;  // cookie object
    var userid;  // user id
    var currentq;  // current question

    // if the cookie already exists, we've already generated scenario data
    // for this user
    if (cc) {
        cky = JSON.parse(cc);
        userid = cky.uid;
        currentq = cky.current;

        // look up current scenario in mongo and send
        Scenarios.findOne({'uid': userid.toString()}, function(err, result) {
          if (result === null) {
            res.sendStatus(500);
          } else {
            cky.sid = result.text[currentq].abbr;
            cky.caught = false;
            res.cookies.set(cookie_name, JSON.stringify(cky), {maxAge: COOKIE_LIFETIME, httpOnly: true, overwrite: true});
            res.send(result.text[currentq]);
          };
        });
    } else {
        // if cookie doesn't exist, redirect to login
        res.redirect('/consent');
    }
});

app.get('/instructed', function(req, res) {
  var cky = JSON.parse(req.cookies.get(cookie_name));
  Scenarios.findOne({'uid': cky.uid}, function(err, result) {
    if (result === null) {
      res.sendStatus(500);
    } else {
      cky.instructed = true;
      result.instructed = true;
      result.save();
      res.cookies.set(cookie_name, JSON.stringify(cky), {maxAge: COOKIE_LIFETIME, httpOnly: true, overwrite: true});
      res.sendStatus(200);
    }
  });
});

app.get('/reinstructed', function(req, res) {
  var cky = JSON.parse(req.cookies.get(cookie_name));
  cky.reinstruct = false;
  res.cookies.set(cookie_name, JSON.stringify(cky), {maxAge: COOKIE_LIFETIME, httpOnly: true, overwrite: true});
  res.sendStatus(200);
})

app.get('/checkReinstruct', function(req, res) {
  var cky = JSON.parse(req.cookies.get(cookie_name));
  var currentq = parseInt(cky.current, 10);
  var userid = cky.uid;
  // var isCatch = CATCH_TRIALS.indexOf(currentq+1)>=0;
  var reinstruct = REINSTRUCT_BEFORE == (currentq+2);

  // check if current question is a catch trial
  // if (isCatch) cky.caught = true;
  if (reinstruct) cky.reinstruct = true;
  res.cookies.set(cookie_name, JSON.stringify(cky), {maxAge: COOKIE_LIFETIME, httpOnly: true, overwrite: true});
  res.sendStatus(200);
})

app.get('/attncheck', function(req, res) {
  var cky = JSON.parse(req.cookies.get(cookie_name));
  var userid = cky.uid;
  var currentq = parseInt(cky.current, 10);
  var whichCatch = CATCH_TRIALS.indexOf(currentq+1);
  resobj = {'check': whichCatch >= 0};
  if (resobj.check) {
    Catches.findOne({'uid': cky.uid}, function(_err, result) {
      if (result === null) {
        res.sendStatus(500);
      } else {
        resobj.type = result.qType[whichCatch]
        resobj.choices = result.choices[whichCatch];
        res.send(resobj);
      };
    })
  } else {
    res.send(resobj);
  }
})

app.post('/checkAttn', function(req, res) {
  if (req.body.ans !== undefined) {
    var cky = JSON.parse(req.cookies.get(cookie_name));
    var currentq = parseInt(cky.current, 10);
    var nWrong = parseInt(cky.inCorrect);
    var whichCatch = CATCH_TRIALS.indexOf(currentq+1);
    var thisAns = parseInt(req.body.ans);
    Catches.findOne({'uid': cky.uid}, function(err, result) {
      if (result === null) {
        res.sendStatus(500);
      } else {
        var thisWrong = result.whichCorr[whichCatch]!=thisAns;
        result.usrAns.push(thisAns);
        result.save();

        nWrong += thisWrong;
        cky.caught = false;
        cky.inCorrect = nWrong;
        res.cookies.set(cookie_name, JSON.stringify(cky), {maxAge: COOKIE_LIFETIME, httpOnly: true, overwrite: true});
        res.send(thisWrong);
      };
    })
  } else {
    res.sendStatus(200);
  }
});

app.get('/next', function(req, res) {
  var cky = JSON.parse(req.cookies.get(cookie_name));
  var currentq = parseInt(cky.current, 10);
  var nextq = currentq + 1;

  if (cky.caught | cky.reinstruct) {
    res.sendStatus(200);
  } else if (nextq < NUM_SCENARIOS) {
    cky.current = nextq;
    res.cookies.set(cookie_name,JSON.stringify(cky),{maxAge: COOKIE_LIFETIME, httpOnly: true, overwrite: true});
    res.sendStatus(200);
  } else if (nextq >= NUM_SCENARIOS) {
    Scenarios.findOne({'uid': cky.uid}, function(err, result) {
      if (result === null) {
        res.sendStatus(500);
      } else {
        result.completed = true;
        result.save();
        cky.completed = true;
        res.cookies.set(cookie_name, JSON.stringify(cky), {maxAge: COOKIE_LIFETIME, httpOnly: true, overwrite: true});
        res.sendStatus(200);
      }
    })
  }
});


app.get('/escape', function(req, res) {
  var cc = req.cookies.get(cookie_name);
  var cky;
  if (cc) {
    cky = JSON.parse(cc);
    Scenarios.findOne({'uid': cky.uid}, function(err, result) {
      if (result === null) {
        res.sendStatus(500);
      } else if (result.completed) {
        res.cookies.set(cookie_name, '',{httpOnly: true, overwrite: true});
        res.redirect(SURVEY_LINK + '?uid=' + result.uid);
      } else {
        res.redirect('/');
      }
    });
  } else {
    res.redirect('/consent');
  };
});

app.post('/save', function(req, res) {
  var cky = JSON.parse(req.cookies.get(cookie_name));
  var userid = cky.uid;
  var currentq = cky.current;
  var scenario = cky.sid;

  var thisdat = new Clicks({
      'uid': userid,
      'question': currentq,
      'scenario': scenario,
      'rating': req.body.rating,
      'recall':req.body.recall,
      'realrate':req.body.realrate,
      'know':req.body.know,
      // 'rate_punishment': req.body.rate_punishment,
      'bardguilt': req.body.bardguilt,
      'mltnguilt': req.body.mltnguilt,
      'subjguilt': req.body.subjguilt,
      'start': req.body.start,
      'stop': req.body.stop
    });
  thisdat.save();
});
