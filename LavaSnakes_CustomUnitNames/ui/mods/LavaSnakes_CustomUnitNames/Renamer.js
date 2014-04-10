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
	
	console.log("LUnitNames: Setup complete");
})();