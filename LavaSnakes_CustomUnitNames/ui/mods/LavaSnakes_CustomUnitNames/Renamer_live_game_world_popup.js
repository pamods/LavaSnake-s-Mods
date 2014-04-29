(function () {

	model.LUnitNames = {};
	
	//Load Array
	if (!window.localStorage.LUnitNames_Rules_List) {
		console.log("LUnitNames: No rules found; creating empty array");
		model.LUnitNames.RulesArray = new Array();
	} else {
		console.log("LUnitNames: Found string, changing to array");
		model.LUnitNames.RulesArray = window.localStorage.LUnitNames_Rules_List.split(",");
	}
	if (LUnitNames_AppendedRulesArray) {
		model.LUnitNames.RulesArray = model.LUnitNames.RulesArray.concat(LUnitNames_AppendedRulesArray);
	}


	var oldhandlershover = handlers.hover;
	handlers.hover = function (payload) {
		if (!$.isEmptyObject(payload)) {
			//Rename main part of pop-up
			if (payload.name) {
				var name = payload.name;
				for (index = 0; index < model.LUnitNames.RulesArray.length; ++index) {
					var RealName = model.LUnitNames.RulesArray[index].split(" > ")[0];
					var NewName = model.LUnitNames.RulesArray[index].split(" > ")[1];

					name = name.replace(new RegExp(RealName, "g"), NewName);
				}
				payload.name = name;
			}
			
			//Rename build name part of pop-up
			if (payload.tool_details.build_target_name) {
				var name = payload.tool_details.build_target_name;
				for (index = 0; index < model.LUnitNames.RulesArray.length; ++index) {
					var RealName = model.LUnitNames.RulesArray[index].split(" > ")[0];
					var NewName = model.LUnitNames.RulesArray[index].split(" > ")[1];

					name = name.replace(new RegExp(RealName, "g"), NewName);
				}
				payload.tool_details.build_target_name = name;
			}
			
			//Rename attack name part of pop-up
			if (payload.tool_details.weapon_target_name) {
				var name = payload.tool_details.weapon_target_name;
				for (index = 0; index < model.LUnitNames.RulesArray.length; ++index) {
					var RealName = model.LUnitNames.RulesArray[index].split(" > ")[0];
					var NewName = model.LUnitNames.RulesArray[index].split(" > ")[1];

					name = name.replace(new RegExp(RealName, "g"), NewName);
				}
				payload.tool_details.weapon_target_name = name;
			}
		}
		oldhandlershover(payload);
	}

	console.log("LUnitNames: Live_game_world_popup setup complete");
})();