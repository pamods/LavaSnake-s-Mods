(function () {

	model.LUnitNames = {};

	//Load Array
	if (!window.localStorage.LUnitNames_Rules_List) {
		console.log("LUnitNames: First time, creating empty array");
		model.LUnitNames.RulesArray = new Array();
	} else {
		console.log("LUnitNames: Found string, changing to array");
		model.LUnitNames.RulesArray = window.localStorage.LUnitNames_Rules_List.split(",");
	}

	var oldhandlerunit_data = handlers.unit_data;
	handlers.unit_data = function (payload) {
		oldhandlerunit_data(payload);
		
		for (id in model.itemDetails) {
			var name = model.itemDetails[id].name();
			for (index = 0; index < model.LUnitNames.RulesArray.length; ++index) {
				var RealName = model.LUnitNames.RulesArray[index].split(" > ")[0];
				var NewName = model.LUnitNames.RulesArray[index].split(" > ")[1];

				name = name.replace(new RegExp(RealName, "g"), NewName);
			}
			model.itemDetails[id].name(name);
		}
	}

	console.log("LUnitNames: Setup complete");
})();