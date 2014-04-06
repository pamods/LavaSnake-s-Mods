//Setup timers and vars
var LTimers = (function () {
	//Setup storage if first time
	if (!window.localStorage.LTimers_Timer1Type) {
		window.localStorage.LTimers_Timer1Type = "Off";
		window.localStorage.LTimers_Timer1Dur = 15;
		window.localStorage.LTimers_Timer1Alert = "0:00";
		
		window.localStorage.LTimers_Timer2Type = "Off";
		window.localStorage.LTimers_Timer2Dur = 15;
		window.localStorage.LTimers_Timer2Alert = "0:00";
		
		window.localStorage.LTimers_Timer3Type = "Off";
		window.localStorage.LTimers_Timer3Dur = 15;
		window.localStorage.LTimers_Timer3Alert = "0:00";
	}

	var LTimers = {};

	LTimers.FlashColor1 = "red";
	LTimers.FlashColor2 = "orange";

	LTimers.Timer1State;
	LTimers.Timer1Value;

	LTimers.Timer2State;
	LTimers.Timer2Value;

	LTimers.Timer3State;
	LTimers.Timer3Value;

	//Set up Timers and GUI
	createFloatingFrame("InGameTimersDiv", 175, 150, {'top': 250});
	$('body').append('<span id="TimerLTimers_ConfigSpan"></span>');

	document.getElementById('InGameTimersDiv_content').innerHTML += '<p><input type="button" oncontextmenu="LTimers_Config(1);" id="Timer1" data-bind="click: function (data, event) { LTimers_TimerClick(1); }" value="Timer 1" /></p>';
	if (window.localStorage.LTimers_Timer1Type == "Normal") {
		LTimers.Timer1State = "Off";
	} else if (window.localStorage.LTimers_Timer1Type == "Repeating") {
		LTimers.Timer1State = "On";
		LTimers.Timer1Value = 1;
	} else if (window.localStorage.LTimers_Timer1Type == "Off") {
		LTimers.Timer1State = "Off";
		document.getElementById('Timer1').value = "Right click to set";
	}

	document.getElementById('InGameTimersDiv_content').innerHTML += '<p><input type="button" oncontextmenu="LTimers_Config(2);" id="Timer2" data-bind="click: function (data, event) { LTimers_TimerClick(2); }" value="Timer 2" /></p>';
	if (window.localStorage.LTimers_Timer2Type == "Normal") {
		LTimers.Timer2State = "Off";
	} else if (window.localStorage.LTimers_Timer2Type == "Repeating") {
		LTimers.Timer2State = "On";
		LTimers.Timer2Value = 1;
	} else if (window.localStorage.LTimers_Timer2Type == "Off") {
		LTimers.Timer2State = "Off";
		document.getElementById('Timer2').value = "Right click to set";
	}

	document.getElementById('InGameTimersDiv_content').innerHTML += '<p><input type="button" oncontextmenu="LTimers_Config(3);" id="Timer3" data-bind="click: function (data, event) { LTimers_TimerClick(3); }" value="Timer 3" /></p>';
	if (window.localStorage.LTimers_Timer3Type == "Normal") {
		LTimers.Timer3State = "Off";
	} else if (window.localStorage.LTimers_Timer3Type == "Repeating") {
		LTimers.Timer3State = "On";
		LTimers.Timer3Value = 1;
	} else if (window.localStorage.LTimers_Timer3Type == "Off") {
		LTimers.Timer3State = "Off";
		document.getElementById('Timer3').value = "Right click to set";
	}
	
	return LTimers;
})();

//Start up clock
$(function () {
	LTimers_tick();

	//Start Clock
	window.setInterval(function(){LTimers_tick()}, 1000);
});

//Runs every second
function LTimers_tick() {
	if (LTimers.Timer1State == "On") {
		LTimers.Timer1Value -= 1;
		document.getElementById('Timer1').value = LTimers_format(LTimers.Timer1Value);
		if (LTimers.Timer1Value == 0) {
			LTimers.Timer1State = "Ringing.1";
			document.getElementById('Timer1').style.color = LTimers.FlashColor1;
			document.getElementById('Timer1').value = window.localStorage.LTimers_Timer1Alert;
		}
	} else if (LTimers.Timer1State == "Ringing.1") {
		LTimers.Timer1State = "Ringing.2";
		document.getElementById('Timer1').style.color = LTimers.FlashColor2;
	} else if (LTimers.Timer1State == "Ringing.2") {
		LTimers.Timer1State = "Ringing.1";
		document.getElementById('Timer1').style.color = LTimers.FlashColor1;
	}
	
	if (LTimers.Timer2State == "On") {
		LTimers.Timer2Value -= 1;
		document.getElementById('Timer2').value = LTimers_format(LTimers.Timer2Value);
		if (LTimers.Timer2Value == 0) {
			LTimers.Timer2State = "Ringing.1";
			document.getElementById('Timer2').style.color = LTimers.FlashColor1;
			document.getElementById('Timer2').value = window.localStorage.LTimers_Timer2Alert;
		}
	} else if (LTimers.Timer2State == "Ringing.1") {
		LTimers.Timer2State = "Ringing.2";
		document.getElementById('Timer2').style.color = LTimers.FlashColor2;
	} else if (LTimers.Timer2State == "Ringing.2") {
		LTimers.Timer2State = "Ringing.1";
		document.getElementById('Timer2').style.color = LTimers.FlashColor1;
	}
	
	if (LTimers.Timer3State == "On") {
		LTimers.Timer3Value -= 1;
		document.getElementById('Timer3').value = LTimers_format(LTimers.Timer3Value);
		if (LTimers.Timer3Value == 0) {
			LTimers.Timer3State = "Ringing.1";
			document.getElementById('Timer3').style.color = LTimers.FlashColor1;
			document.getElementById('Timer3').value = window.localStorage.LTimers_Timer3Alert;
		}
	} else if (LTimers.Timer3State == "Ringing.1") {
		LTimers.Timer3State = "Ringing.2";
		document.getElementById('Timer3').style.color = LTimers.FlashColor2;
	} else if (LTimers.Timer3State == "Ringing.2") {
		LTimers.Timer3State = "Ringing.1";
		document.getElementById('Timer3').style.color = LTimers.FlashColor1;
	}
}

//Button click event
function LTimers_TimerClick(Which) {
	if (Which == 1 && window.localStorage.LTimers_Timer1Type != "Off") {
		if (LTimers.Timer1State == "On") {
			LTimers.Timer1State = "Off";
			document.getElementById('Timer1').value = "Timer 1";
		} else if (LTimers.Timer1State == "Off") {
			LTimers.Timer1Value = window.localStorage.LTimers_Timer1Dur * 60;
			LTimers.Timer1State = "On";
		} else if (LTimers.Timer1State == "Ringing.1" || LTimers.Timer1State == "Ringing.2") {
			document.getElementById('Timer1').style.color = "";
			if (window.localStorage.LTimers_Timer1Type == "Repeating") {
				LTimers.Timer1Value = window.localStorage.LTimers_Timer1Dur * 60;
				LTimers.Timer1State = "On";
			} else {
				LTimers.Timer1State = "Off";
				document.getElementById('Timer1').value = "Timer 1";
			}
		}
	} else if (Which == 2 && window.localStorage.LTimers_Timer2Type != "Off") {
		if (LTimers.Timer2State == "On") {
			LTimers.Timer2State = "Off";
			document.getElementById('Timer2').value = "Timer 2";
		} else if (LTimers.Timer2State == "Off") {
			LTimers.Timer2Value = window.localStorage.LTimers_Timer2Dur * 60;
			LTimers.Timer2State = "On";
		} else if (LTimers.Timer2State == "Ringing.2" || LTimers.Timer2State == "Ringing.2") {
			document.getElementById('Timer2').style.color = "";
			if (window.localStorage.LTimers_Timer2Type == "Repeating") {
				LTimers.Timer2Value = window.localStorage.LTimers_Timer2Dur * 60;
				LTimers.Timer2State = "On";
			} else {
				LTimers.Timer2State = "Off";
				document.getElementById('Timer2').value = "Timer 2";
			}
		}
	} else if (Which == 3 && window.localStorage.LTimers_Timer3Type != "Off") {
		if (LTimers.Timer3State == "On") {
			LTimers.Timer3State = "Off";
			document.getElementById('Timer3').value = "Timer 3";
		} else if (LTimers.Timer3State == "Off") {
			LTimers.Timer3Value = window.localStorage.LTimers_Timer3Dur * 60;
			LTimers.Timer3State = "On";
		} else if (LTimers.Timer3State == "Ringing.3" || LTimers.Timer3State == "Ringing.2") {
			document.getElementById('Timer3').style.color = "";
			if (window.localStorage.LTimers_Timer3Type == "Repeating") {
				LTimers.Timer3Value = window.localStorage.LTimers_Timer3Dur * 60;
				LTimers.Timer3State = "On";
			} else {
				LTimers.Timer3State = "Off";
				document.getElementById('Timer3').value = "Timer 3";
			}
		}
	}
}

//Handle the LTimers_Configuration of timers
function LTimers_Config(Which) {
	//Get current data
	var Types;
	var Dur;
	var Alert;
	if (Which == 1) {
		Alert = window.localStorage.LTimers_Timer1Alert;
		Dur = window.localStorage.LTimers_Timer1Dur;
		if (window.localStorage.LTimers_Timer1Type == "Off") {
			Types = '<option selected="selected">Off</option><option>Normal</option><option>Repeating</option>';
		} else if (window.localStorage.LTimers_Timer1Type == "Normal") {
			Types = '<option>Off</option><option selected="selected">Normal</option><option>Repeating</option>';
		} else if (window.localStorage.LTimers_Timer1Type == "Repeating") {
			Types = '<option>Off</option><option>Normal</option><option selected="selected">Repeating</option>';
		}
	} else if (Which == 2) {
		Alert = window.localStorage.LTimers_Timer2Alert;
		Dur = window.localStorage.LTimers_Timer2Dur;
		if (window.localStorage.LTimers_Timer2Type == "Off") {
			Types = '<option selected="selected">Off</option><option>Normal</option><option>Repeating</option>';
		} else if (window.localStorage.LTimers_Timer2Type == "Normal") {
			Types = '<option>Off</option><option selected="selected">Normal</option><option>Repeating</option>';
		} else if (window.localStorage.LTimers_Timer2Type == "Repeating") {
			Types = '<option>Off</option><option>Normal</option><option selected="selected">Repeating</option>';
		}
	} else if (Which == 3) {
		Alert = window.localStorage.LTimers_Timer3Alert;
		Dur = window.localStorage.LTimers_Timer3Dur;
		if (window.localStorage.LTimers_Timer3Type == "Off") {
			Types = '<option selected="selected">Off</option><option>Normal</option><option>Repeating</option>';
		} else if (window.localStorage.LTimers_Timer3Type == "Normal") {
			Types = '<option>Off</option><option selected="selected">Normal</option><option>Repeating</option>';
		} else if (window.localStorage.LTimers_Timer3Type == "Repeating") {
			Types = '<option>Off</option><option>Normal</option><option selected="selected">Repeating</option>';
		}
	}
	
	//Show dialog
	document.getElementById('TimerLTimers_ConfigSpan').innerHTML = 
		'<div style="margin: 0px auto; position: absolute; background: rgba(0,0,0,.5); padding: 10px; left: 20px; top: 200px; right: 20px; height: 300px; width: 250px; border: 1px solid rgba(255,255,255,.1);	border-radius: 4px;">' +
			'<div style="margin: 0px 0px 4px 0px; font-weight: bold; font-size: 1.2em;"> COnNIGURATION FOR TIMER ' + Which + 
				'<a data-bind="click_sound: \'default\'" onclick="document.getElementById(\'TimerLTimers_ConfigSpan\').innerHTML = \'\';"><img style="float:right;" src="../../main/shared/img/close_btn.png"></a>' +
			'</div>' +
			'<p>Mode: ' +
				'<select onchange="window.localStorage.LTimers_Timer' + Which + 'Type = this.options[this.selectedIndex].value;">' +
					Types +
				'</select>' +
			'</p>' +
			'<p>Duration: ' +
				'<input style="width: 75px;" type="text" value="' + Dur + '" onchange="window.localStorage.LTimers_Timer' + Which + 'Dur = this.value">' +
			' minutes</p>' +
			'<p>Text to display when done: ' +
				'<input style="width: 75px;" type="text" value="' + Alert + '" onchange="window.localStorage.LTimers_Timer' + Which + 'Alert = this.value">' +
			'</p>' +
		'</div>';
}

//Turns an amount of seconds into Minutes:Seconds
function LTimers_format(Secs) {
	var Minutes = parseInt(Secs / 60);
	var SecondsLeft = String(Secs - (Minutes * 60));
	if (SecondsLeft.length == 1) { SecondsLeft = "0" + SecondsLeft; }
	return Minutes + ":" + SecondsLeft;
}