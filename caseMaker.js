function getCond(design) {
  var factors = design.factors;
  var levels = design.levels;
  var condcode = design.conditions;
  var allcond = [];

  // check how many each condition has until
  for (c of condcode) {
    var cond = {};
    for (var j = 0; j < factors.length; j++) {
      cond[factors[j]] = levels[j][c[j]-1];
    }
    allcond.push(cond);
  }

  return(allcond);
}

function getWithin(design) {
  var allcond = getCond(design);
  var sequence = [];

  for (var i = 0; i < allcond.length; i++)
    sequence.push(...Array(design.counts[i]).fill(allcond[i]));

  switch (design.sequence) {
    case 'shuffled':
      shuffle(sequence);
  }
  console.log(sequence)

  return(sequence);
}

function randomizeScenarios(data, structure, factorlevel = 'random', number,
    catch_type, catch_trials) {
    // given array of possible scenarios data, returns an array
    // of actual scenarios, each entry an object
    // number is the number of scenarios to grab
    var pdata = shuffle(data.slice());  // permute scenarios
    var catchType = shuffle(catch_type.slice()); //randomize type of catch trial
    var crimes = pdata.map(function (x) {return x.crime}); //for catch trials

    var randomScenarios = [];
    var catchQs = [];
    var catchAs = [];
    // get shuffled indices for variable combinations
    var combos = structure.combinations[factorlevel].slice();
    shuffle(combos);

    while (combos.length < number) {
      deepCopy = combos.map((x) => x);
      combos = combos.concat(shuffle(deepCopy));
    }

    // if number not specified, default to all possible variable combos
    // var maxiter = number || combos.length;

    for (var i = 0; i < number; i++) {
        var sc = extractByCode(pdata[i], structure, combos[i]);
        var whichCatch = catch_trials.indexOf(i+1);
        randomScenarios.push(sc);

        if (whichCatch>=0) {
          switch (catchType[whichCatch]) {
            case 'evidence':
              tmp = evidMC(pdata[i].vars, sc.evidenceSet, structure);
              break;
            case  'crime':
              tmp = crimeMC(i,crimes.slice());
              break;
          }
          catchQs.push(tmp[0]);
          catchAs.push(tmp[1]);
        }
    }
    return [randomScenarios, catchQs, catchAs, catchType];
}

function crimeMC(ind,allCrimes) {
  var whichCorr;
  var nrep = 3;
  var choices = [];
  var ccr = allCrimes[ind];
  allCrimes.splice(ind,1);
  choices.push(ccr);

  for (var j=0; j<nrep; j++) {
    var cj = randIndex(allCrimes.length);
    choices.push(allCrimes[cj]);
    allCrimes.splice(cj,1);
  }

  shuffle(choices);
  whichCorr = choices.indexOf(ccr);
  return [choices, whichCorr];
}

function evidMC(evAvail, evUsed, structure) {
  var choices = [];
  var l = evUsed.length;
  var menu = [];
  var whichCorr;
  var nrep = 3;
  var ci = randIndex(l);

  // randomly select one presented piece of evidence
  // this is the correct option... unless it doesn't exist
  cev = evAvail[evUsed[ci]['type']][evUsed[ci]['level']];
  if (cev) {
    choices.push(cev);
  }
  // construct menu of all possible evidence pieces
  // ugly hack...
  for (var j=0; j < structure.vars.length; j++) {
    var v = structure.vars[j];
    for (var k=0; k < structure.levels[j].length; k++) {
      if (structure.levels[j][k]!='none') {
        menu.push(v+' '+structure.levels[j][k]);
      }
    }
  }
  // remove evidence that was already used
  for (var j=0; j < l; j++) {
    menu.splice(menu.indexOf(evUsed[j]['type']+' '+evUsed[j]['level']),1);
  }
  // select three random pieces of unused evidence
  for (var j=0; j < nrep; j++) {
    var cj = randIndex(menu.length);
    var evj = menu[cj].split(' ');
    choices.push(evAvail[evj[0]][evj[1]]);
    menu.splice(cj,1);
  }
  // randomize order and append final option
  shuffle(choices);
  // get index of correct evidence, if there is such a thing
  if (cev) {
    whichCorr = choices.indexOf(cev);
  } else {
    choices.push('None of the above.');
    whichCorr = nrep;
  }
  return [choices, whichCorr]
}

function extractByCode(scenario, struct, code) {
  // given a json scenario specification, a structure object,
  // and an array of integer levels of each
  // variable type, return a specific scenario

  var sc = {};
  var variables = struct.vars;
  var levels = struct.levels;  // levels of each variable

  sc.abbr = scenario.abbr;
  sc.base = scenario.base;
  sc.evidenceSet = [];
  // sc.none = [];
  var incp = [];
  var excp = [];
  var ambi = [];

  for (var i = 0; i < variables.length; i++) {
    var this_var = variables[i];
    var this_level = levels[i][code[i]];
    var this_text = scenario.vars[this_var][this_level];
    // var this_piece = {'variable': this_var, 'text': this_text, 'level': this_level};
    var this_piece = {'text': this_text};

    sc.evidenceSet.push({'type': this_var, 'level': this_level});
    //separate into categories for ordering
    if (this_level == 'clear_in') {
      incp.push(this_piece);
    }
    else if (this_level == 'ambiguous') {
      ambi.push(this_piece);
    }
    else if (this_level == 'clear_ex') {
      excp.push(this_piece);
    }
  }
  // shuffle order of data pieces
  sc.piece = shuffle(incp).concat(shuffle(ambi)).concat(shuffle(excp));
  return sc;
}

function shuffle(x) {
  // Knuth shuffle of entries in x
  var N = x.length;
  var tmp;
  var j;
  //While elements remain for shuffling
  while (N) {
    //Pick a remaining element
    i = Math.floor(Math.random() * N--);
    // Swap that with the current element
    tmp = x[N];
    x[N] = x[i];
    x[i] = tmp;
  }
  return x;
}

function randIndex(n) {
  return Math.floor(Math.random()*n)
}

module.exports = {getCond, getWithin, randomizeScenarios}
