//Add menu items for use later
$('#A12').parent().parent().parent().before('<tr><td id="LProfilePic_I1" class="td_start_menu_item" data-bind="visible: showingReady"></td></tr>');
$('#A12').parent().parent().parent().before('<tr><td id="LProfilePic_PAS" class="td_start_menu_item" data-bind="visible: showingReady"></td></tr>');

//Main function to enclose local vars and such
$(function () {	
	//Wait for user to sign in
	var refreshIntervalId = setInterval(function(){
		console.log("LProfilePic: Waiting for sign in");
		
		if (model.displayName() != "") {
			//User has signed in
			clearInterval(refreshIntervalId);
			
			//Check settings
			if (!window.localStorage.LProfilePic_URL) {
				//No user name saved, find Uber forums pic and use instead
				
				var Username = model.uberName();
				var xhr = new XMLHttpRequest();
				xhr.open("GET", "https://forums.uberent.com/members/?username=" + Username, false);
				xhr.send();
				
				var idLoc = xhr.responseText.indexOf("<link rel=\"canonical\" href=\"https://forums.uberent.com/members/") + 66;
				idLoc = xhr.responseText.indexOf(".", idLoc) + 1;
				var id = xhr.responseText.substring(idLoc, xhr.responseText.indexOf("/", idLoc));
				console.log("LProfilePic: Pic found to use as default: https://forums.uberent.com/data/avatars/l/" + id.substr(0, 4) + "/" + id + ".jpg");

				window.localStorage.LProfilePic_URL = "https://forums.uberent.com/data/avatars/l/" + id.substr(0, 4) + "/" + id + ".jpg";
			}
			if (!window.localStorage.LProfilePic_ShowPAS) {
				window.localStorage.LProfilePic_ShowPAS = "true";
			}

			console.log("LProfilePic: Settings checked.");

			//Add mod config menu
			$('body').append('<span id="PicConfigSpan"></span>');
			var elements = document.getElementsByClassName("div_start_menu_profile_pic");
			elements[0].style.background = "url(" + window.localStorage.LProfilePic_URL + ") center center #333";
			elements[0].style.backgroundSize = "80px 80px";
			elements[0].onclick = function() { 
				//Show dialog
				var CheckedState = "";
				if (window.localStorage.LProfilePic_ShowPAS == "true") {
					CheckedState = " checked ";
				}
				
				document.getElementById('PicConfigSpan').innerHTML = 
					'<div style="margin: 0px auto; position: absolute; background: rgba(0,0,0,.5); padding: 10px; left: 20px; top: 200px; right: 20px; height: 130px; width: 500px; border: 1px solid rgba(255,255,255,.1);	border-radius: 4px;">' +
						'<div style="margin: 0px 0px 4px 0px; font-weight: bold; font-size: 1.2em;"> SET PROFILE PICTURE ' + 
							'<a data-bind="click_sound: \'default\'" onclick="LSPPF_updateAndClose();"><img style="float:right;" src="../shared/img/close_btn.png"></a>' +
						'</div>' +
						'<p>URL: ' +
							'<input style="width: 475px;" type="text" value="' + window.localStorage.LProfilePic_URL + '" onchange="window.localStorage.LProfilePic_URL = this.value">' +
						'</p>' +
						'<p>' +
							'<input type="checkbox"' + CheckedState + 'onchange="window.localStorage.LProfilePic_ShowPAS = this.checked">Show PA Stats Ladder Data' +
						'</p>' +
					'</div>';
			};

			console.log("LProfilePic: Config UI added.");
			
			//Do some Awesome?
			if (Math.floor((Math.random()*5)+1) == 5) {
				var Awesome = "";
				var WhatAwesome = Math.floor((Math.random()*10)+1);
				
				if (WhatAwesome == 1) {
					Awesome = "Don't lose!";
				} else if (WhatAwesome == 2) {
					Awesome = "PA is awesome!";
				} else if (WhatAwesome == 3) {
					Awesome = "It's in beta for a reason.";
				} else if (WhatAwesome == 4) {
					Awesome = "Nice profile pic!";
				} else if (WhatAwesome == 5) {
					Awesome = "Randomness can be beneficial.";
				} else if (WhatAwesome == 6) {
					Awesome = "That AI is scaring me.";
				} else if (WhatAwesome == 7) {
					Awesome = "Go Uber!";
				} else if (WhatAwesome == 8) {
					Awesome = "Throw the asteroid!";
				} else if (WhatAwesome == 9) {
					Awesome = "New UI is coming soon!";
				} else {
					elements[0].style.background = "url(coui://ui/mods/LavaSnakes_ProfilePicFixer/a.gif) center center #333";
					elements[0].style.backgroundSize = "80px 80px";
					elements[0].style.backgroundRepeat = "no-repeat";
					Awesome = "SO AWESOME!!!";
				}
				
				$('#LProfilePic_I1').html('<span class="link_start_menu_item"><a href="#" id="A8" data-bind="click_sound: \'default\', rollover_sound: \'default\'"><span class="start_menu_item_lbl" style="color: black;">'
					+ Awesome + 
					'</span></a></span>');

				console.log("LProfilePic: Awesome done.");
			}

			//Add ladder pic
			if (window.localStorage.LProfilePic_ShowPAS == "true") {
				$('#LProfilePic_PAS').html('<span class="link_start_menu_item"><a href="#" id="A8" data-bind="click_sound: \'default\', rollover_sound: \'default\'"><span class="start_menu_item_lbl"><img src="http://pastats-ladder.gamestown24.de/avatars/' + model.displayName() + '.png"></span></a></span>');
			}

			console.log("LProfilePic: Ladder pic done.");
			
			console.log("LProfilePic: Post sign in setup done.");
		}
	}, 500);
});

function LSPPF_updateAndClose() {
	//Update pic to new setting
	var elements = document.getElementsByClassName("div_start_menu_profile_pic");
	elements[0].style.background = "url(" + window.localStorage.LProfilePic_URL + ") center center #333";
	elements[0].style.backgroundSize = "80px 80px";
	
	//Update ladder pic to new setting
	if ($("#LProfilePic_PAS").length > 0 && window.localStorage.LProfilePic_ShowPAS == "false") {
		//It is in the UI and needs to be removed
		$("#LProfilePic_PAS").parent().remove();
	} else if (!$("#LProfilePic_PAS").length > 0 && window.localStorage.LProfilePic_ShowPAS == "true") {
		//It is not in the UI and needs to be added
		$('#A12').parent().parent().parent().before('<tr><td id="LProfilePic_PAS" class="td_start_menu_item" data-bind="visible: showingReady"></td></tr>');
		$('#LProfilePic_PAS').html('<span class="link_start_menu_item"><a href="#" id="A8" data-bind="click_sound: \'default\', rollover_sound: \'default\'"><span class="start_menu_item_lbl"><img src="http://pastats-ladder.gamestown24.de/avatars/' + model.displayName() + '.png"></span></a></span>');
	}
	
	//Close
	document.getElementById('PicConfigSpan').innerHTML = '';
	
	console.log("LProfilePic: UI updated.");
}