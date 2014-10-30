var model;
var handlers = {};

$(document).ready(function () {

	function FloatZoneModel() {
		var self = this;
		
	}
	model = new FloatZoneModel();
	
	//Listen for responses from live_game
	handlers.floatmessage = function(payload) {
		eval(payload.ref + "(" + payload.result + ")");
		//console.log(payload);
	};

	//Inject per scene mods
	if (scene_mod_list['LiveGame_FloatZone'])
		loadMods(scene_mod_list['LiveGame_FloatZone']);

	//Setup send/recv messages and signals
	app.registerWithCoherent(model, handlers);

	//Activates knockout.js
	ko.applyBindings(model);
});

//Get the result of eval from live_game and write it to the local ko observable destination
function evalLiveGame(eval, destination) {
	var payload = {
		eval: eval,
		ref: destination,
		linkage: false
	};
	api.Panel.message(api.Panel.parentId, "floatmessage", payload);
}

//Make a link between the live_game ko observable koObject and the local ko observable destination
function addLinkageLiveGame(koObject, destination) {
	var payload = {
		eval: koObject,
		ref: destination,
		linkage: true
	};
	api.Panel.message(api.Panel.parentId, "floatmessage", payload);
}