//Add the FloatZone panel
$(function () {
	var $panel = $("<panel id='LiveGame_FloatZone'></panel>").css({
		visibility: "visible",
		width: "100%",
		height: "100%",
    }).attr({
		name: "LiveGame_FloatZone",
		src: "coui://ui/mods/rFloatFrame/FloatZone.html",
		"yield-focus": true,
		fit: "dock-top-left",
    }).addClass("ignoreMouse");
    $panel.appendTo("body");
    api.Panel.bindElement($panel[0]);
	//Delayed so the positioning works out right
	$panel.css("display", "flex");
});

//Listen for messages from FloatZone and reply to them
handlers.floatmessage = function(payload) {
	payload.result = eval(payload.eval);
	api.panels.LiveGame_FloatZone.message("floatmessage", payload);
	
	//Add linkage if requested to send future changes
	if (payload.linkage) {
		eval(payload.eval.replace("()", "")).subscribe(function(newValue) {
			payload.result = newValue;
			api.panels.LiveGame_FloatZone.message("floatmessage", payload);
		});
	}
};