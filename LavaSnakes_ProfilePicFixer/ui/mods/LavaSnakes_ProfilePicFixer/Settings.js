(function () {
	console.log("LProfilePic: Checking passed value");
	if (window.localStorage.LProfilePic_displayName != "") {
		//User is signed in
		console.log("LProfilePic: Adding UI");
		model.addSetting_Text("URL of Profile Pic:", "LProfilePic_URL", "UI", "Text", "", "ProfilePic+ Settings");
		model.addSetting_Button("", "Get profile pic URL from Uber forums", "UI", "model.LProfilePic_GetPicURL", "ProfilePic+ Settings");
		model.addSetting_Text("URL of image to display below the main menu:", "LProfilePic_Sig", "UI", "Text", "", "ProfilePic+ Settings");
		model.addSetting_Button("", "Use PA Stats Ladder pic", "UI", "model.LProfilePic_GetPSLadder", "ProfilePic+ Settings");
		model.addSetting_Text("You can also paste in some custom HTML to display in the main menu: ", "LProfilePic_HTML", "UI", "Text", "", "ProfilePic+ Settings");
	} else {
		//Tell the user to sign in
		console.log("LProfilePic: Told the user to sign in");
		model.addSettingGroup("UI", "Please go back to the main menu and sign in. This will allow ProfilePic+ to generate settings for you based on your Uber account.");
	}
})();

model.LProfilePic_GetPicURL = function () {
	var Username = window.localStorage.LProfilePic_displayName;
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "https://forums.uberent.com/members/?username=" + Username, false);
	xhr.send();
	
	//and a big thanks to raevn for these two lines...
	var picHTML = $(xhr.responseText).find(".avatarScaler").find("img");
	var url = picHTML.attr("src");
	
	if (url) {
		//Pic has been found!
		model.LProfilePic_URL("https://forums.uberent.com/" + url);
		console.log("LProfilePic: Pic URL found: " + decode(localStorage.settings).LProfilePic_URL);
	} else {
		//Error in finding pic
		model.LProfilePic_URL("Error getting profile pic");
		console.log("LProfilePic: Can't find pic URL. Telling user to figure it out.");
	}
}

model.LProfilePic_GetPSLadder = function () {
	var Username = window.localStorage.LProfilePic_UberName;
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "http://pastats.com/report/getplayerid?ubername=" + Username, false);
	xhr.send();
	
	var Output = xhr.responseText;
	
	if (Output == -1) {
		//Error in finding pic
		model.LProfilePic_Sig("Error, please find picture manually");
		console.log("Error getting ladder pic");
	} else {
		//Pic has been found!
		model.LProfilePic_Sig("http://ladder.pastats.tk/avatars/" + Output + ".png");
		console.log("LProfilePic: Ladder pic URL found: " + decode(localStorage.settings).LProfilePic_Sig);
	}
}