(function() {
	initialSettingValue('commander_hp_icon', 'Progenitor');
	var settings = decode(localStorage.settings);
	var commanderNames = new Array("Progenitor", "Alpha", "Theta", "Invictus/Delta", "Centurion", "Rallus", "Aeson", "Osiris", "Nemicus");
	var commanderImages = new Array("img/build_bar/units/imperial_progenitor.png", "img/build_bar/units/imperial_alpha.png", "img/build_bar/units/imperial_theta.png", "img/build_bar/units/imperial_invictus.png", "img/build_bar/units/raptor_centurion.png", "img/build_bar/units/raptor_rallus.png", "img/build_bar/units/tank_aeson.png", "img/build_bar/units/quad_osiris.png", "img/build_bar/units/raptor_nemicus.png");
	var setComImg = false;
	var count = 0;
	while (setComImg == false) {
		if (settings['commander_hp_icon'] == commanderNames[count]) {
			setComImg = commanderImages[count];
		}
		count++;
	}

	createFloatingFrame('commander_info_frame', 240, 50, {'offset': 'topRight', 'left': -240});
	
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
									'<img src="' + setComImg + '"/>' +
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
})();