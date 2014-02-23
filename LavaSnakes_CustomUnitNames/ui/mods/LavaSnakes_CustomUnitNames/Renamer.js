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
	
	setInterval(function () { model.LUnitNames_RenameTick(); }, 500);
	
	console.log("LUnitNames: Setup complete");
})();

model.LUnitNames_RenameTick = function () {
	for (index = 0; index < model.LUnitNames.RulesArray.length; ++index) {
		var RealName = model.LUnitNames.RulesArray[index].split(" > ")[0];
		var NewName = model.LUnitNames.RulesArray[index].split(" > ")[1];
		
    	$("#hover_unit_name").html($("#hover_unit_name").html().replace(new RegExp(RealName, "g"), NewName));
	}
	console.log("LUnitNames: Units renamed");
}