$(function () {
	createFloatingFrame('commander_info_frame', 240, 50, {'offset': 'topRight', 'left': -240});
	
	model.commanderHealth = ko.observable(1);
	model.commander_hp_DoPanic = ko.computed(function() {
		if (model.commanderHealth() <= .5) {
			return true;
		} else {
			return false;
		}
	});

	$('#commander_info_frame_content').append(
		'<div class="div_commander_bar" data-bind="">' +
			'<div class="div_commander_bar_cont">' +
				'<table>' +
					'<tbody>' +
						'<tr>' +
							'<td>' +
								'<div class="commander_info_img" data-bind="click: function() { api.select.commander(); api.camera.track(true); }">' +
									'<img src="coui://ui/mods/rCommanderHP/icon_si_commander.png"/>' +
									'<div class="select_link_ComHP">' +
										'<a>Select</a>' +
									'</div>' +
								'</div>' +
							'</td>' +
							'<td>' +
								'<div class="div_status_bar_display">' +
									'<div class="status_bar_frame_commanderHP">' +
										'<div class="status_bar_commanderHP" data-bind="style: {width: \'\' + (model.commanderHealth() * 158) + \'px\'}"></div>' +
									'</div>' +
									'<div class="status_stats">' +
										'<span data-bind="text: parseInt(model.commanderHealth() * 12500)"></span>/12500' +
										'<br /><span class="warning_ComHP" data-bind="visible: model.commander_hp_DoPanic()">WARNING, LOW HEALTH!</span>' +
									'</div>' +
								'</div>' +
							'</td>' +
						'</tr>' +
					'</tbody>' +
				'</table>' +
			'</div>' +
		'</div>');
		
	var toLiveGame = { funct: function () { console.log("test"); } };
	toLiveGame.funct();
	//RunLiveGame(toLiveGame);
});