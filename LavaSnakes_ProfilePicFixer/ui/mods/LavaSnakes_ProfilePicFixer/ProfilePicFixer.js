//Main function to enclose local vars and such
$(function () {
	//Save displayName for setting menu
	window.localStorage.LProfilePic_displayName = model.displayName();
	window.localStorage.LProfilePic_UberName = model.uberName();
	
	var settings = decode(localStorage.settings);
	
	//Wait for user to sign in
	var refreshIntervalId = setInterval(function () {
		console.log("LProfilePic: Waiting for sign in");
		
		if (model.displayName() != "") {
			//User has signed in
			clearInterval(refreshIntervalId);
			
			//Save displayName for setting menu
			window.localStorage.LProfilePic_displayName = model.displayName();
			
			//Check settings
			if (!settings.LProfilePic_URL) {
				//No pic saved, find Uber forums pic and use instead
				var Username = model.uberName();
				var xhr = new XMLHttpRequest();
				xhr.open("GET", "https://forums.uberent.com/members/?username=" + Username, false);
				xhr.send();
				
				//and a big thanks to raevn for these two lines...
				var picHTML = $(xhr.responseText).find(".avatarScaler").find("img");
				var url = picHTML.attr("src");
				
				if (url) {
					//Pic has been found!
					settings.LProfilePic_URL = "https://forums.uberent.com/" + url;
					localStorage.settings = encode(settings);
					console.log("LProfilePic: Default pic URL found: " + settings.LProfilePic_URL);
					
					//Welcome new user
					$("html").append("<div id='LProfilePic_Welcome' title='Welcome to ProfilePic+'>Your Uber Forums profile pic has been automaticly added. You can change it and add tracking pics in the settings menu. Just look for the ProfilePic+ section in the UI tab.<br /><br />Enjoy! LavaSnake</div>");
					$("#LProfilePic_Welcome").dialog({
						draggable: false,
						resizable: false,
						width: "30%",
						modal: true
					});
					$("div[aria-describedby='LProfilePic_Welcome'] >> .ui-dialog-titlebar-close").html("X").css("background-color", "black").css("color", "white");
				} else {
					//Error in finding pic
					console.log("LProfilePic: Can't find default pic URL. Telling user to figure it out.");
					settings.LProfilePic_URL = "";
					localStorage.settings = encode(settings);
					
					//Welcome new user
					$("html").append("<div title='Welcome to ProfilePic+'>Sorry, but there was an error finding your Uber Forums profile pic. You can set that and add tracking pics in the settings menu. Just look for the ProfilePic+ section in the UI tab.<br /><br />Enjoy! LavaSnake</div>");
					$("#LProfilePic_Welcome").dialog({
						draggable: false,
						resizable: false,
						width: "30%",
						modal: true
					});
					$("div[aria-describedby='LProfilePic_Welcome'] >> .ui-dialog-titlebar-close").html("X").css("background-color", "black").css("color", "white");
				}
			}
			console.log("LProfilePic: Settings checked.");
			
			//Add profile pic
			$("#menu_cont").css("margin-top", "0px");
			$("#player-display-name").css("padding-top", "0px");
			$("#player-display-name").before('<img style="margin: 10px; height: 100px; padding: 3px; border: 3px; -webkit-background-clip: border-box; -webkit-background-origin: padding-box; -webkit-background-size: auto;  -webkit-border-image: url(coui://ui/alpha/start/img/btn_start_menu_rect_rest.png) 10 14 18 / 1 / 0px stretch; -webkit-box-shadow: rgb(13, 13, 13) 1000px 1000px 1000px 1000px inset; margin-bottom: 0px;" src="' + settings.LProfilePic_URL + '">');
			console.log("LProfilePic: Profile pic added.");
			
			//Add other UI
			initialSettingValue("LProfilePic_Sig", "");
			initialSettingValue("LProfilePic_HTML", "");
			if (settings.LProfilePic_Sig != "" && settings.LProfilePic_Sig != null) {
				$("#logo_menu").append('<img style="margin: 10px; width: 99%; padding: 3px; border: 3px; -webkit-background-clip: border-box; -webkit-background-origin: padding-box; -webkit-background-size: auto;  -webkit-border-image: url(coui://ui/alpha/start/img/btn_start_menu_rect_rest.png) 10 14 18 / 1 / 0px stretch; -webkit-box-shadow: rgb(13, 13, 13) 1000px 1000px 1000px 1000px inset; margin-bottom: 0px;" src="' + settings.LProfilePic_Sig + '" align="center">');
			}
			
			if (settings.LProfilePic_HTML != "" && settings.LProfilePic_HTML != null) {
				$("#menu_cont").append("<div style='margin: 10px;'>" + settings.LProfilePic_HTML + "</div>");
			}
			console.log("LProfilePic: Other UI added.");
			
			console.log("LProfilePic: Post sign in setup done.");
		}
	}, 500);
});