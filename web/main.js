$(function () {

    init();

    function init() {
        getPeers();
        getBlockchain();
    }

    $("#btnGetPeers").click(function () {
        getPeers();
    });

    $("#btnDiscoverPeers").click(function () {
        discoverPeers();
    });

    $("#btnGetBlockchain").click(function () {
        getBlockchain();
    });

    $("#btnAddRetBlock").click(function () {
        saveBlock("retail");
    });

    $("#btnAddDistBlock").click(function () {
        saveBlock("distribution");
    });

    $("#btnAddManBlock").click(function () {
        saveBlock("manufacturing");
    });

    $("#btnAddPeer").click(function () {
        savePeer();
    });

    $('#network').on('click', '.btnDisconnect', function(){
        disconnectPeer(event.target.attributes.data.nodeValue);
    });

    function getBlockchain() {
        $.ajax({
            type: "GET",
            url: "api/v1/blocks",
            dataType: "json",
            success: function (data) {
                if (data.length > 0) {
                    var table = $("#blocks tbody");
                    $("#blocks tbody tr").remove();
                    $.each(data, function (idx, block) {
                        table.append("<tr><td>" + block.index
                        + "</td><td>" + block.timestamp 
                        + "</td>   <td>" + block.data 
                        + "<br /><b>Hash:</b> " + block.hash 
                        + "<br /><b>Previous Hash:</b> " + block.previousHash 
                        + "<br /><b>Source Node:</b> " + block.sourceNode 
                        + "</td></tr>");
                    });
                }
            }
        })
    }

    function discoverPeers() {
        $.ajax({
            type: "GET",
            url: "api/v1/peers/discover",
            dataType: "json",
            success: function (data) {
                setTimeout(getPeers, 2000);
            }
        })
    }

    function getPeers() {
        $.ajax({
            type: "GET",
            url: "api/v1/peers",
            dataType: "json",
            success: function (data) {
                if (data.length > 0) {
                    var table = $("#peers tbody");
                    $("#peers tbody tr").remove();
                    $.each(data, function (idx, peer) {
                        table.append("<tr><td>" + peer 
                        + "</td><td><button type='button' class='btnDisconnect' data='" + peer + "'><i class='fa fa-trash'></i>  Remove</button>"
                        + "</td></tr>");
                    });
                }
            }
        })
    }

    function saveBlock(data_type) {
        var data;
        var server_url;

        if (data_type == "manufacturing") {
            server_url = "http://localhost:3001";
            data = {
                prodName: $('#man_prodName').val(),
                expDate: $('#man_expDate').val(),
                serialNo: $('#man_serialNo').val(),
                source: "Manufacturer"
            };
        } else if (data_type == "distribution") {
            server_url = "http://localhost:3002";
            data = {
                serialNo: $('#dist_serialNo').val(),
                recievedDate: $('#dist_recDate').val(),
                source: "Distrubtion"
            };
        } else if (data_type == "retail") {
            server_url = "http://localhost:3003";
            data = {
                serialNo: $('#ret_serialNo').val(),
                recievedDate: $('#ret_recDate').val(),
                source: "Retail"
            };
        }

        $.ajax({
            method: "POST",
            url: server_url + "/api/v1/blocks/mine",
            contentType: "application/json",
            data: JSON.stringify(data),
            dataType: 'json',
            success: function() {
                getBlockchain();
                showMessage("Block added from " + data.source, "alert-success");
            }
        })
    }

    function savePeer() {
        var data = {
            peer: $('#url').val()
        };


        $.ajax({
            method: "POST",
            url: "api/v1/peers/add",
            contentType: "application/json",
            data: JSON.stringify(data),
            dataType: 'json',
            success: function() {
                getPeers();
                showMessage("Peer added", "alert-success");
            }
        })
    }

    function disconnectPeer(url) {
        var data = {
            peer: url
        };


        $.ajax({
            method: "DELETE",
            url: "api/v1/peers",
            contentType: "application/json",
            data: JSON.stringify(data),
            dataType: 'json',
            success: function() {
                getPeers();
                showMessage("Peer disconnected", "alert-success");
            }
        })
    }

    function showMessage(message, status) {
        $('#message').html(message);
        $('#alert').addClass(status);
        $('#alert').show();
    }




    $(function(){
        $("[data-hide]").on("click", function(){
            $(this).closest("." + $(this).attr("data-hide")).hide();
        });
    });

});