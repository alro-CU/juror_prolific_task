//load after turnpage.css!
var currentPage = 1;
var prefix = '#page';

// $(document).ready(setupTurn);

function setupTurner() {
  $('#moveon').attr('disabled','');
  $('#next').click(goNext);
  $('#back').click(goBack);
  $('#back').attr('disabled','');
  writePageNum();
  $('#page1').show();
  // $('moveon').click(resetpage)
}

function goNext() {
    var n = document.getElementsByClassName('page').length;
    if (currentPage < n) {
        $(prefix.concat(currentPage.toString())).hide();
        currentPage += 1;
        $(prefix.concat(currentPage.toString())).show();
        writePageNum();
        $('#back').removeAttr('disabled');
    };
    if (currentPage == n) {
        $('#moveon').removeAttr('disabled');
        $('#next').attr('disabled','');
    };
}

function goBack() {
    var n = document.getElementsByClassName('page').length;
    if (currentPage == n) {
        $('#next').removeAttr('disabled');
    };
    if (currentPage > 1) {
        $(prefix.concat(currentPage.toString())).hide();
        currentPage += -1;
        $(prefix.concat(currentPage.toString())).show();
        writePageNum();
    };
    if (currentPage == 1) {
        $('#back').attr('disabled','');
    };
}

function writePageNum() {
    var n = document.getElementsByClassName('page').length;
    $('#pagenumber').text( currentPage.toString() + ' / ' + n.toString())
}

function resetPage() {
    $(prefix.concat(currentPage.toString())).hide();
    $('#page1').show();
    currentPage = 1;
    writePageNum();
    $('#back').attr('disabled','');
    $('#next').removeAttr('disabled');
}
