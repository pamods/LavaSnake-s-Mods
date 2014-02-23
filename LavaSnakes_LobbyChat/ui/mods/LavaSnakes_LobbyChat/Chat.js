$(function () {
	//Get user name
	console.log("LChat: Found user name: " + model.displayName());

	//Setup UI
	var CalcedY = ($(".div_body_cont").css("height").replace("px", "") - 150) / 2;
	$(".div_server_list_cont").css("height", CalcedY + "px");
	$(".div_body_cont").append("<iframe src='https://kiwiirc.com/client/irc.kiwiirc.com/?nick=" + model.displayName() + "&theme=cli#planetaryannihilation-global' style='border:0; width: 99%; height: " + CalcedY + "px; padding-right: 15px;'></iframe>");
	console.log("LChat: Ready!");
});