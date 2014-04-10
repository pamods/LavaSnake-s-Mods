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
	
	//Rename in build bar
	/*var oldhandler = handlers.unit_data;
	handlers.unit_data = function (payload) {
		oldhandler(payload);
		
        var id;
        var element;
        var sicon;

        model.itemDetails = {};
        for (id in payload.data) {
            element = payload.data[id];
            sicon = (element.sicon_override)
                    ? element.sicon_override
                    : id.substring(id.search(start), id.search(end));
			
			console.log(element.name);
			var name = element.name;
			for (index = 0; index < model.LUnitNames.RulesArray.length; ++index) {
				var RealName = model.LUnitNames.RulesArray[index].split(" > ")[0];
				var NewName = model.LUnitNames.RulesArray[index].split(" > ")[1];

				name = name.replace(new RegExp(RealName, "g"), NewName);
			}
			
            model.itemDetails[id] = new UnitDetailModel(name,
                                                        element.description,
                                                        element.cost,
                                                        sicon);
        }

        // nuke hack 
        // the projectiles are not magically added to the unit_list, so the display details aren't sent to the ui
        model.itemDetails['/pa/units/land/nuke_launcher/nuke_launcher_ammo.json'] = new UnitDetailModel('nuke', 'LR-96 -Pacifier- Missile', 32400);
        model.itemDetails['/pa/units/land/anti_nuke_launcher/anti_nuke_launcher_ammo.json'] = new UnitDetailModel('anti nuke', 'SR-24 -Shield- Missile Defense', 17280);
	
		console.log("LUnitNames: Custom unit data set");
    }*/
	
	console.log("LUnitNames: Setup complete");
})();