var clickData = [];
var startTime;
var stopTime;
var question;
$(document).ready(setupPage);

function setupPage() {
  $.ajaxSetup({
    error: function (x, status, error) {
      window.location.href ="/html/crashout.html";
    }
  });

  $('#rating').slider({change: function(event, ui) {
    $('#rating a.ui-slider-handle').show();}
  });

  $('#recall').slider({change: function(event, ui) {
    $('#recall a.ui-slider-handle').show();}
  });

  // $('#fam').slider({change: function(event, ui) {
    // $('#fam a.ui-slider-handle').show();}
  // });

  $('#realrate').slider({change: function(event, ui) {
    $('#realrate a.ui-slider-handle').show();}
  });

  $('#know').slider({change: function(event, ui) {
    $('#know a.ui-slider-handle').show();}
  });
  // $('#rate_punishment').slider({
  // change: function(event, ui) {
  //     $('#rate_punishment a.ui-slider-handle').show();
  //   }
  // });

  $('a.ui-slider-handle').hide();

  $('.question').hide();
  $('.capstone').hide();

  $.get('/condition', function(data) {
    cond = data;
    // console.log(cond);

    // if (cond.rating) {
    //   setupTurner();
    // } else {
    //   $('#pageturner').hide();
    //   $('#page2').show();
    //   $('#moveon').removeAttr('disabled');
    // };

    for (var i = 0; i < cond.question.length; i++) {
      $('#' + cond.question[i]).show();
    };

    $.get('/current', function(data, status, jqobj) {
      loadText(data);
      if (data.condition.capstone) {
        $('.capstone').show()
      }

      document.getElementById("cover").style.visibility = "visible";
    });
  });
  
  $.get("/attncheck", function(data, status, jqobj) {
    attn = data;
    if (data.check) {
      if (data.type=="evidence") {
        $("#catch").append("<p>Which piece of evidence is present in this scenario?</p>")
      } else if (data.type=="crime") {
        $("#catch").append("<p>Which crime occurred in the this scenario?</p>")
      }
      var mcq = ""
      for (var i=0; i < data.choices.length; i++) {
        mcq += assembleButton(i,data.choices[i]);
      }
      $("#catch").append(mcq);
      $('#catch').show();
    }
  });

  // postView();
  $('#moveon').click(endQuestion);
  startTime = new Date();
}

function endQuestion() {
  $('#moveon').attr('disabled','');
  // var punStatus = $('#rate_punishment a.ui-slider-handle').css('display');
  attnResp = undefined;

  if (cond.rating) {
    var ret2go = $('#rating a.ui-slider-handle').css('display') !== 'none'  &&  $('#recall a.ui-slider-handle').css('display') !== 'none'  &&  $('#know a.ui-slider-handle').css('display') !== 'none'  &&  $('#realrate a.ui-slider-handle').css('display') !== 'none';
  } else {
    var ret2go = true;
  }
  for (i = 0; i < cond.question.length; i++) {
    var resp = $('input[name=' + cond.question[i] + ']:checked').val();
    ret2go = ret2go & (resp !== undefined);
  };
  if (attn.check) {
    attnResp = $('input[name=evmc]:checked').val();
    ret2go = ret2go & (resp !== undefined);
  };

  if (ret2go) {
    saveClicks();
    // resetPage();
    $.post('/checkAttn', {"ans": attnResp}, function() {
      $.get('/checkReinstruct', function(resp) {
        $.get('/next', function(resp) {
          window.location.href = '/';
        });
      });
    });
  } else {
    alert('Please answer each question before proceeding.')
    $('#moveon').removeAttr('disabled');
  };
}

function saveClicks() {
  stopTime = new Date();
  // create new object with everything we want to push
  var trialData = {start: startTime, stop: stopTime, rating: $('#rating').slider('value'), recall: $('#recall').slider('value'), realrate: $('#realrate').slider('value'), know: $('#know').slider('value')};
  for (var i = 0; i <cond.question.length; i++) {
    trialData[cond.question[i] + 'guilt'] = $('input[name=' + cond.question[i] + ']:checked').val();
  }
  if (attn.check) {
    trialData.attn = $('input[name=evmc]:checked').val();
  }
  $.post('/save', trialData, function(data) {
    // reset for the next question
    for (var i = 0; i <cond.question.length; i++) {
      $('input[name=' + cond.question[i] + ']').prop('checked', false);
    }
    $('#rating').slider('value', 0);
    $('#recall').slider('value', 0);
    // $('#fam').slider('value', 0);
    $('#realrate').slider('value', 0);
    $('#know').slider('value', 0);
    $('a.ui-slider-handle').hide();
    // push to server.js, which will push to mongo
    // nextQuestion();
  });
}

function loadText(data) {
    var basetmpl = $('#base').html();
    var basehtml = Mustache.render(basetmpl, data);

    var evidtmpl = $('#evidence').html();
    var evidhtml = Mustache.render(evidtmpl, data);

    $('#base_descr').html(basehtml);
    $('#evid_descr').html(evidhtml);
}

function assembleButton(ind,txt) {
  return "<div class=\"radio\"><label><input type=\"radio\" name=\"evmc\" value=" +
   ind + ">" + txt + "</label></div>";
}
