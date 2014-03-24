//------------ LavaDraw ------------ 
	//Info: A set of Sketch.js tools by LavaSnake. LavaDraw was written for use by cptconundrum in the Sketch.js mod for PA casters.
	//Version: 1.0
	//URL: https://github.com/pamods/LavaSnake-s-Mods/tree/master/LavaDraw%20(Sketch.js%20Tools)
	//Included Tools: "arrow" A basic arrow with an auto-added head, "stamp" An image stamp with a changeable image setting

//Global LavaDraw Settings - Edit to change tool options
var LavaDraw = {};
LavaDraw.StampImg = "https://d3f1e1s5hz92ob.cloudfront.net/asset-version/z91a2e88bb4ecb89d84c97370febce7d9/Content/UberNetSite/images/img_item_detail_delta.png";

//Basic arrow, uses global Sketch.js line settings
$.sketch.tools.arrow = {
	Xs: null,
	Ys: null,
	onEvent: function(e) {
		switch (e.type) {
			case 'mousedown':
			case 'touchstart':
				Xs = new Array();
				Ys = new Array();
				Xs.push(e.pageX - this.canvas.offset().left);
				Ys.push(e.pageY - this.canvas.offset().top);
				this.startPainting();
				break;
			case 'mouseup':
			case 'mouseout':
			case 'mouseleave':
			case 'touchend':
			case 'touchcancel':
				if (this.action) {
					//Calculate to draw arrow head direction
					var x = e.pageX - this.canvas.offset().left;
					var y = e.pageY - this.canvas.offset().top;
					var oldX = x;
					var oldY = y;
					var count = Xs.length;
					while (Math.abs(x - oldX) < 25 && Math.abs(y - oldY) < 25) {
						count--;
						if (count != 0) {
							oldX = Xs[count];
							oldY = Ys[count];
						} else {
							oldX = Xs[count];
							oldY = Ys[count];
							break;
						}
					}
					
					var deltaX = x - oldX;
					var deltaY = y - oldY;
					var ArrowHead1X, ArrowHead1Y, ArrowHead2X, ArrowHead2Y;
					if (Math.abs(deltaX) > Math.abs(deltaY)) {
						//Line is horizontal
						ArrowHead1Y =  -15;
						ArrowHead2Y =  15;
						if (deltaX > 0) {
							//Line is left to right
							ArrowHead1X = -15;
							ArrowHead2X = -15;
						} else {
							//Line is right to left
							ArrowHead1X = 15;
							ArrowHead2X = 15;
						}
					} else {
						//Line is vertical
						ArrowHead1X = -15;
						ArrowHead2X = +15;
						if (deltaY > 0) {
							//Line is top to bottom
							ArrowHead1Y =  -15;
							ArrowHead2Y =  -15;
						} else {
							//Line is bottom to top
							ArrowHead1Y =  15;
							ArrowHead2Y =  15;
						}
					}
					
					//Add custom event to action
					this.action.events.push({
						x: x,
						y: y,
						ArrowHead1X: ArrowHead1X,
						ArrowHead1Y: ArrowHead1Y,
						ArrowHead2X: ArrowHead2X,
						ArrowHead2Y: ArrowHead2Y,
						event: "ArrowHead"
					});
				}
				
				this.stopPainting();
		}
		if (this.painting) {
			this.action.events.push({
				x: e.pageX - this.canvas.offset().left,
				y: e.pageY - this.canvas.offset().top,
				event: e.type
			});
			Xs.push(e.pageX - this.canvas.offset().left);
			Ys.push(e.pageY - this.canvas.offset().top);
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
			if (event.event == "ArrowHead") {
				//Render arrow head
				this.context.moveTo(event.x + event.ArrowHead1X, event.y + event.ArrowHead1Y);
				this.context.lineTo(event.x, event.y);
				
				this.context.moveTo(event.x + event.ArrowHead2X, event.y + event.ArrowHead2Y);
				this.context.lineTo(event.x, event.y);
				
				this.context.moveTo(event.x, event.y);
			} else {
				this.context.lineTo(event.x, event.y);
			}
			previous = event;
		}
		this.context.strokeStyle = action.color;
		this.context.lineWidth = action.size;
		return this.context.stroke();
	}
};

//Image Stamp, set the image used by the stamp in the LavaDraw object
//This tool is by cptconundrum with edits by LavaSnake
$.sketch.tools.stamp = {
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
                event: e.type,
				img: LavaDraw.StampImg
            });
            return this.redraw();
        }
    },
    draw: function(action) {
        var event, previous, _i, _len, _ref;
        _ref = action.events;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            event = _ref[_i];

            var context = this.context;
            var imageObj = new Image();
            imageObj.onload = function() {
                context.drawImage(imageObj, event.x, event.y);
            };
            imageObj.src = event.img;

            previous = event;
        }
        return this.context.stroke();
    }
};