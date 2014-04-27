(function () {
	if (bif) {
		model.LUnitNames = {};
		
		//Load Array
		if (!window.localStorage.LUnitNames_Rules_List) {
			console.log("LUnitNames: No rules found; creating empty array");
			model.LUnitNames.RulesArray = new Array();
		} else {
			console.log("LUnitNames: Found string, changing to array");
			model.LUnitNames.RulesArray = window.localStorage.LUnitNames_Rules_List.split(",");
		}
		
		//Hackish way to execute function after all mods are loaded
		setTimeout(function () {
			console.log("LUnitNames: Set BIF callback");
			bif.registerBIFReadyCallback(function () {
				var RulesArray = model.LUnitNames.RulesArray;
				
				//Rename
				for (index = 0; index < bif.unit_list.units.length; ++index) {
					var id = bif.unit_list.units[index].substring(bif.unit_list.units[index].lastIndexOf("/") + 1, bif.unit_list.units[index].indexOf(".json"));
					var name = bif.units[id].display_name;
					if (name) {
						for (index2 = 0; index2 < RulesArray.length; ++index2) {
							var RealName = RulesArray[index2].split(" > ")[0];
							var NewName = RulesArray[index2].split(" > ")[1];

							name = name.replace(new RegExp(RealName, "g"), NewName);
						}
						bif.units[id].display_name = name;
					}
				}
				
				console.log("LUnitNames: BIF setup complete");
			});
		}, 1);
	}
})();