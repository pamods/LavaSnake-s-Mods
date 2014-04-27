(function () {
	model.LUnitNames = {};
	initialSettingValue("LUnitNames_Rules", "");
	
	//Load Array
	if (!window.localStorage.LUnitNames_Rules_List) {
		console.log("LUnitNames: First time, creating empty array");
		model.LUnitNames.RulesArray = new Array();
	} else {
		console.log("LUnitNames: Found string, changing to array");
		model.LUnitNames.RulesArray = window.localStorage.LUnitNames_Rules_List.split(",");
	}
	
	//Add settings GUI items
	model.addSetting_MultiSelect("Rules to apply to units for renaming:", "LUnitNames_Rules", "UI", model.LUnitNames.RulesArray, 0, 10, "Unit renaming rules");
	model.addSetting_Button("", "Add new rule", "UI", "model.LUnitNames_Add", "Unit renaming rules");
	model.addSetting_Button("", "Edit selected rule", "UI", "model.LUnitNames_Edit", "Unit renaming rules");
	model.addSetting_Button("", "Remove selected rule", "UI", "model.LUnitNames_Remove", "Unit renaming rules");
	
	//Enlarge the list
	$("select[data-bind='options: LUnitNames_Rules_options, selectedOptions: LUnitNames_Rules']").css("width", "100%");
		
	//Add span for editing dialog
	$('body').append('<span id="LUnitNames_ConfigSpan"></span>');
	
	console.log("LUnitNames: Settings GUI has been setup");
	
	//Setup non repeat counter
	if (!window.localStorage.LUnitNames_Rules_Count) { window.localStorage.LUnitNames_Rules_Count = 0; }
})();

model.LUnitNames_Add = function () {
	//Add new rule to array in mem
	if (model.LUnitNames.RulesArray.length == 0) {
		model.LUnitNames.RulesArray = ["Original Unit Name > Custom Unit Name"];
	} else {
		model.LUnitNames.RulesArray[model.LUnitNames.RulesArray.length] = 
			"Original Unit Name " + window.localStorage.LUnitNames_Rules_Count + " > Custom Unit Name " + window.localStorage.LUnitNames_Rules_Count;
		window.localStorage.LUnitNames_Rules_Count++;
	}
	
	//Save
	window.localStorage.LUnitNames_Rules_List = model.LUnitNames.RulesArray;
	model.LUnitNames_Rules_options(model.LUnitNames.RulesArray);
	
	console.log("LUnitNames: Added");
	console.log(model.LUnitNames.RulesArray);
}

model.LUnitNames_Edit = function () {
	var selected = $("select[data-bind=\"options: LUnitNames_Rules_options, selectedOptions: LUnitNames_Rules\"]").val();
	if (selected.length != 0) {
		//Get current values
		var RealName = selected[0].split(" > ")[0];
		var NewName = selected[0].split(" > ")[1];
		
		//Show dialog
		$("#LUnitNames_ConfigSpan").html(
			'<div style="position: absolute; background: rgba(0,0,0,.5); left: 0px; top: 00px; right: 0px; bottom: 0px;" />' +
			'<div style="margin: 0px auto; position: absolute; background: rgba(0,0,0,.5); padding: 10px; left: 20px; top: 200px; right: 20px; height: 300px; width: 270px; border: 1px solid rgba(255,255,255,.1); border-radius: 4px;">' +
				'<div style="margin: 0px 0px 4px 0px; font-weight: bold; font-size: 1.2em;"> Edit Rule: </div>' +
				'<p>Real Name: <br />' +
					'<input style="width: 245px;" type="text" value="' + RealName + '" id="LUnitNames_RealName">' +
				'</p>' +
				'<p>New Name: <br />' +
					'<input style="width: 245px;" type="text" value="' + NewName + '" id="LUnitNames_NewName">' +
				'</p>' +
				'<input type="Button" class="settings_button" onclick="model.LUnitNames_DoneEdit()" value="Done">' +
			'</div>');
			
		console.log("LUnitNames: Editing");
	} else {
		console.log("LUnitNames: Nothing selected to edit");
	}
}

model.LUnitNames_DoneEdit = function () {
	//Get new values and close dialog
	var RealName = $("#LUnitNames_RealName").val().replace(/,/g, "");
	var NewName = $("#LUnitNames_NewName").val().replace(/,/g, "");
	$("#LUnitNames_ConfigSpan").html("");
	
	//Write new values to RulesArray
	var selected = $("select[data-bind=\"options: LUnitNames_Rules_options, selectedOptions: LUnitNames_Rules\"]").val();
	var index = model.LUnitNames.RulesArray.indexOf(selected[0]);
	model.LUnitNames.RulesArray[index] = RealName + " > " + NewName;
	
	//Save
	window.localStorage.LUnitNames_Rules_List = model.LUnitNames.RulesArray;
	model.LUnitNames_Rules_options(model.LUnitNames.RulesArray);
	
	console.log("LUnitNames: Done Editing");
	console.log(model.LUnitNames.RulesArray);
}

model.LUnitNames_Remove = function () {
	//Remove selected rule from array in mem if one is selected
	var selected = $("select[data-bind=\"options: LUnitNames_Rules_options, selectedOptions: LUnitNames_Rules\"]").val();
	if (selected.length != 0) {
		var index = model.LUnitNames.RulesArray.indexOf(selected[0]);
		model.LUnitNames.RulesArray.splice(index, 1);
		
		//Save
		window.localStorage.LUnitNames_Rules_List = model.LUnitNames.RulesArray;
		model.LUnitNames_Rules_options(model.LUnitNames.RulesArray);
		
		console.log("LUnitNames: Removed");
		console.log(model.LUnitNames.RulesArray);
	} else {
		console.log("LUnitNames: Nothing selected to remove");
	}
}