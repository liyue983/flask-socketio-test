function logone(ele) {
    $("#log").prepend(
        "<br>" +
        $("<div/>")
            .text("Received from [" + ele.user + "]: " + ele.msg)
            .html()
    );
}

$(document).ready(function () {
    $.get("/latest/15", function (data) {
        try {
            // alert(data);
            data["data"].forEach((element) => {
                logone(element);
            });
        } catch (error) {
            alert(error);
        }
    });
    // Connect to the Socket.IO server.
    // The connection URL has the following format, relative to the current page:
    //     http[s]://<domain>:<port>[/<namespace>]
    var socket = io();

    // Event handler for new connections.
    // The callback function is invoked when a connection with the
    // server is established.
    socket.on("connect", function () {
        socket.emit("my_event", { data: "I'm connected!" });
    });

    // Event handler for server sent data.
    // The callback function is invoked whenever the server emits data
    // to the client. The data is then displayed in the "Received"
    // section of the page.
    socket.on("my_response", function (message, cb) {
        logone(message["data"]);
        if (cb) cb();
    });

    $("form#emit").submit(function (event) {
        socket.emit("my_event", {
            data: {
                msg: $("#emit_data").val(),
                user: getPlatformName() + "-" + getBrowserName(),
            },
        });
        return false;
    });
    $("form#broadcast").submit(function (event) {
        socket.emit("my_broadcast_event", {
            data: {
                msg: $("#broadcast_data").val(),
                user: getPlatformName() + "-" + getBrowserName(),
            },
        });
        return false;
    });
});
