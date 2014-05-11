(function() {
	initialSettingValue('commander_hp_display_show', 'ALWAYS');

	bif.registerBIFReadyCallback(function () {
		//var commanderImages = new Array('img/build_bar/units/imperial_delta.png', 'img/build_bar/units/imperial_alpha.png', 'img/build_bar/units/raptor_base.png', 'img/build_bar/units/quad_base.png', 'img/build_bar/units/tank_base.png');
		
	});
	
	var settings = decode(localStorage.settings);
	model.commander_hp_display_show = ko.computed(function() { return settings['commander_hp_display_show'] == 'ALWAYS'});

	createFloatingFrame('commander_info_frame', 240, 50, {'offset': 'topRight', 'left': -240});

	$('#commander_info_frame_content').append(
		'<div class="div_commander_bar" data-bind="visible: model.armySize() > 0 && (model.armyAlertModel.commanderUnderAttackAlert.test(model.commanderHealth()) !== undefined || model.commander_hp_display_show())">' +
			//Only display commander HUD if player isn't dead (has more than 1 unit) and either the commander is under attack or the show setting is set to always
			'<div class="div_commander_bar_cont">' +
			'<table>' +
				'<tbody>' +
					'<tr>' +
						'<td>' +
							'<div class="commander_info_img" data-bind="click: function() { api.select.commander(); api.camera.track(true); }">' +
								'<img src="img/build_bar/units/quad_osiris.png"/>' +
								'<div class="select_link_ComHP">' +
									'<a>Select</a>' +
								'</div>' +
							'</div>' +
						'</td>' +
						'<td>' +
							'<div class="div_status_bar_display">' +
								'<div class="status_bar_frame">' +
									'<div class="status_bar_commanderHP" data-bind="visible: !model.armyAlertModel.commanderUnderAttackAlert.test(model.commanderHealth()) !== undefined, style: {width: \'\' + (model.commanderHealth() * 158) + \'px\'}"></div>' +
									'<div class="status_bar_commanderLowHP" data-bind="visible: model.armyAlertModel.commanderLowHealthAlert.test(model.commanderHealth()) !== undefined, style: {width: \'\' + (model.commanderHealth() * 158) + \'px\'}"></div>' +
								'</div>' +
								'<div class="status_stats">' +
									'<span data-bind="text: parseInt(model.commanderHealth() * 12500)"></span>/12500' +
									'<span class="warning" data-bind="visible: model.armyAlertModel.commanderLowHealthAlert.test(model.commanderHealth()) !== undefined">WARNING!</span>' +
								'</div>' +
							'</div>' +
						'</td>' +
					'</tr>' +
				'</tbody>' +
			'</table>' +
			'</div>' +
		'</div>');
})();