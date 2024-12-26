$(document).ready(setupPage);

function setupPage() {
  $.ajaxSetup({
    error: function (x, status, error) {
      window.location.href ="/html/crashout.html";
    }
  });
  setupTurner();
  // bind event handlers
  $('#moveon').click(() => $.get('/instructed', (res) => window.location.replace('/')));
  $('.instruction').hide();
  $.get('/condition', function(data) {
    question = data.question;
    for (var i = 0; i <question.length; i++) {
      $('#' + question[i]).show();
    };
    if (data.rating) {
      $('#csRating').show();
    };
    // for displaying instructions to other memory questions?? 
    if (data.rating) {
      $('#recall').show();
    };
    // if (data.rating) {
      // $('#fam').show();
    // };
    if (data.rating) {
      $('#know').show();
    };
    if (data.rating) {
      $('#realrate').show();
    };
    if (!data.rating & question.length==1) {
      $('#plural').hide()
    } else {
      $('#singular').hide();
    }
  });
  $(document).bind('keypress', function(k) {
    if (k.which === 13) { // enter key
      $('#start').trigger('click');
    }
  });
}
