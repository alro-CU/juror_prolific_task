var serverURL = "http://" + window.location.host;
$(document).ready(setupPage);

function setupPage() {
    $.ajaxSetup({
      error: function (x, status, error) {
        window.location.href ="/html/crashout.html";
      }
    });
    // bind event handlers
    $("#moveon").click(sendLogin);
    $(document).bind('keypress', function(k) {
        if (k.which === 13) { // enter key
            $("#login").trigger('click');
        }
    });
};

function sendLogin() {
    // send user id to server, which will creat db entry
    var uid = encodeURI($("#uidinput").val());
    if (uid) {
        var credentials = {"uid": uid};
        $.post(serverURL + "/init", credentials, function(data, textStatus) {
            window.location.replace(data);
        });
    };
}
