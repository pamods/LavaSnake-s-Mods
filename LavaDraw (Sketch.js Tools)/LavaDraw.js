//LavaDraw is the lame name for a set of Sketch.js tools I'm writing for cptconundrum to use in this mod idea: https://forums.uberent.com/threads/request-click-drag-colorful-arrows-for-casters.58029/

$.sketch.tools.arrow = {
	onEvent: function(e) {
		switch (e.type) {
			case 'mousedown':
			case 'touchstart':
				this.startPainting();
				break;
			case 'mouseup':
			case 'mouseout':
			case 'mouseleave':
			case 'touchend':
			case 'touchcancel':
			this.stopPainting();
		}
		if (this.painting) {
			this.action.events.push({
				x: e.pageX - this.canvas.offset().left,
				y: e.pageY - this.canvas.offset().top,
				event: e.type
			});
			return this.redraw();
		}
	},
	draw: function(action) {
		var event, previous, _i, _len, _ref;
		this.context.lineJoin = "round";
		this.context.lineCap = "round";
		this.context.beginPath();
		this.context.moveTo(action.events[0].x, action.events[0].y);
		_ref = action.events;
		for (_i = 0, _len = _ref.length; _i < _len; _i++) {
			event = _ref[_i];
			this.context.lineTo(event.x, event.y);
			previous = event;
		}
		this.context.strokeStyle = action.color;
		this.context.lineWidth = action.size;
		return this.context.stroke();
	}
};