function forgetFramePosition(id) {
	localStorage.removeItem('frames_' + id);
}

function createFloatingFrame(id, width, height, options) {
	var styleTop = '';
	var styleLeft = '';
	var styleResize = '';
	
	var rememberPosition = true;
	var delayResize = options['delayResize'] || false ;
	
	if (options['rememberPosition'] != null) {
		rememberPosition = options['rememberPosition'];
	}
	
	if (decode(localStorage['frames_' + id]) && rememberPosition == true) {
		styleLeft = "left: " + decode(localStorage['frames_' + id]).x + "px; ";
		styleTop = "top: " + decode(localStorage['frames_' + id]).y + "px; ";
	} else {
		var offsetX = 0;
		var offsetY = 0;
		
		if (options['offset']) {
			if (options['offset'] == 'topRight') {
				offsetX = $(options['containment'] ? options['containment'] : "body").width();
			}
			if (options['offset'] == 'bottomLeft') {
				offsetY = $(options['containment'] ? options['containment'] : "body").height();
			}
			if (options['offset'] == 'bottomRight') {
				offsetX = $(options['containment'] ? options['containment'] : "body").width();
				offsetY = $(options['containment'] ? options['containment'] : "body").height();
			}
			if (options['offset'] == 'topCenter') {
				offsetX = $(options['containment'] ? options['containment'] : "body").width() / 2;
			}
			if (options['offset'] == 'bottomCenter') {
				offsetX = $(options['containment'] ? options['containment'] : "body").width() / 2;
				offsetY = $(options['containment'] ? options['containment'] : "body").height();
			}
			if (options['offset'] == 'leftCenter') {
				offsetY = $(options['containment'] ? options['containment'] : "body").height() / 2;
			}
			if (options['offset'] == 'rightCenter') {
				offsetX = $(options['containment'] ? options['containment'] : "body").width();
				offsetY = $(options['containment'] ? options['containment'] : "body").height() / 2;
			}
			if (options['offset'] == 'center') {
				offsetX = $(options['containment'] ? options['containment'] : "body").width() / 2;
				offsetY = $(options['containment'] ? options['containment'] : "body").height() / 2;
			}
		}
		if (options['left']) {
			offsetX += options['left'];
		}
		styleLeft = "left: " + offsetX + "px; ";
		
		if (options['top']) {
			offsetY += options['top'];
		}
		styleTop = "top: " + offsetY + "px; ";
	}
	if (delayResize == true) {
		styleResize = "display: none; ";
	}
	
	$('body').append(
		'<div id="' + id + '" class="drag_main" style="width:' + width + 'px; height:' + height + 'px; ' + styleLeft + styleTop + '">' +
			'<div id="' + id + '_content" class="div_drag_cont" style="' + styleResize + '"></div>' +
		'</div>');
		
    $('#' + id).draggable({
        start: function(event, ui) {
            ui.helper.bind("click.prevent",
                function(event) { event.preventDefault(); });
        },
        stop: function(event, ui) {
            setTimeout(function(){ui.helper.unbind("click.prevent");}, 300);
				var position = {
					'x': $(this).position().left, 
					'y': $(this).position().top,
					'xPercent': $(this).position().left / ($(options['containment'] ? options['containment'] : "body").width() - $(this).width()), 
					'yPercent': $(this).position().top / ($(options['containment'] ? options['containment'] : "body").height() - $(this).height())};
					
				position.xPercent = Math.min(Math.max(position.xPercent, 0), 1);
				position.yPercent = Math.min(Math.max(position.yPercent, 0), 1);
				
				localStorage['frames_' + id] = encode(position);
        },
		'containment': options['containment'] ? options['containment'] : "body",
		'snap': options['snap'] ? options['snap'] : true
	});
	
	if (rememberPosition == false || decode(localStorage['frames_' + id]) == null) {
		var position = {
			'x': offsetX, 
			'y': offsetY,
			'xPercent': offsetX / ($(options['containment'] ? options['containment'] : "body").width() - (width == 'auto' ? $(this).parent().width() : width)), 
			'yPercent': offsetY / ($(options['containment'] ? options['containment'] : "body").height() - (height == 'auto' ? $(this).parent().height() : height))};

		position.xPercent = Math.min(Math.max(position.xPercent, 0), 1);
		position.yPercent = Math.min(Math.max(position.yPercent, 0), 1);
		
		localStorage['frames_' + id] = encode(position);
	}
	
	if (delayResize == true) {
		$(window).resize(function() { setTimeout( function(){
			$('#' + id).css({left: $(options['containment'] ? options['containment'] : "body").position().left + ($(options['containment'] ? options['containment'] : "body").width() - $('#' + id).width()) * decode(localStorage['frames_' + id]).xPercent});
			$('#' + id).css({top: $(options['containment'] ? options['containment'] : "body").position().top + ($(options['containment'] ? options['containment'] : "body").height() - $('#' + id).height()) * decode(localStorage['frames_' + id]).yPercent});
			$('#' + id + "_content").css({display: 'block'});
		}, 110); }).trigger('resize');
	} else {
		$(window).resize(function() {
			$('#' + id).css({left: $(options['containment'] ? options['containment'] : "body").position().left + ($(options['containment'] ? options['containment'] : "body").width() - $('#' + id).width()) * decode(localStorage['frames_' + id]).xPercent});
			$('#' + id).css({top: $(options['containment'] ? options['containment'] : "body").position().top + ($(options['containment'] ? options['containment'] : "body").height() - $('#' + id).height()) * decode(localStorage['frames_' + id]).yPercent});
		}).trigger('resize');
	}
	
}