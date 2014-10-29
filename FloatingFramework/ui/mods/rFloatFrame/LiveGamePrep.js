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

	//Set up for cross-panel stuff
	handlers.LiveGame = function(Code) {
		Code.funct();
		console.log("Message received from LiveGame_FloatZone");
	};
});

function SendBack(Code) {
	api.panels.LiveGame_FloatZone.message("LiveGame_FloatZone", Code);
}