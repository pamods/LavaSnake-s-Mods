//------------ LavaDraw ------------ 
	//Info: A set of Sketch.js tools by LavaSnake. LavaDraw was written for use by cptconundrum in the Sketch.js mod for PA casters.
	//Version: 1.2
	//URL: https://github.com/pamods/LavaSnake-s-Mods/tree/master/LavaDraw%20(Sketch.js%20Tools)
	//Included Tools: "arrow" A basic arrow with an auto-added head, "stamp" An image stamp with a changeable image setting

//Global LavaDraw Settings - Edit to change tool options
var LavaDraw = {};
LavaDraw.StampImg = "https://d3f1e1s5hz92ob.cloudfront.net/asset-version/z91a2e88bb4ecb89d84c97370febce7d9/Content/UberNetSite/images/img_item_detail_delta.png";
LavaDraw.ArrowHeadSize = 20;

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
					//Calculate arrow head direction
					//(Drawing of what this code does is in Arrow Head Mock-up.png)
					var x = Xs[Xs.length - 1];
					var y = Ys[Ys.length - 1];
					var oldX = x;
					var oldY = y;
					
					//Get XY of a place a little ways back along the arrow
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
					
					//Get length of the sides of the triangle made by XY and oldXY
					var deltaX = x - oldX;
					var deltaY = y - oldY;
					var hypo = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
					
					//Find arrow's angle from vertical and then the angles of the arrow head lines
					var ArrowRad = Math.PI - Math.acos(deltaY / hypo);
					var ArrowHead1Rad = ArrowRad + (Math.PI / 4);
					var ArrowHead2Rad = ArrowRad - (Math.PI / 4);
					
					if (ArrowHead2Rad < 0) {
						ArrowHead2Rad = (2 * Math.PI) + ArrowHead2Rad;
					}
					
					//Find XY of arrow head lines
					var ArrowHead1DeltaX = Math.sin(ArrowHead1Rad) * LavaDraw.ArrowHeadSize;
					var ArrowHead1DeltaY = Math.cos(ArrowHead1Rad) * LavaDraw.ArrowHeadSize;
					
					var ArrowHead2DeltaX = Math.sin(ArrowHead2Rad) * LavaDraw.ArrowHeadSize;
					var ArrowHead2DeltaY = Math.cos(ArrowHead2Rad) * LavaDraw.ArrowHeadSize;
					
					//Flip arrow lines if wrong
					if (deltaX > 0) {
						ArrowHead1DeltaX = -ArrowHead1DeltaX;
						ArrowHead2DeltaX = -ArrowHead2DeltaX;
						if (ArrowHead1DeltaX > 0 && ArrowHead2DeltaX > 0) {
							//Arrow is flipped on X axis
							ArrowHead1DeltaX = -ArrowHead1DeltaX;
							ArrowHead2DeltaX = -ArrowHead2DeltaX;
							console.log("flip!");
						}
					} else {
						if (ArrowHead1DeltaX < 0 && ArrowHead2DeltaX < 0) {
							//Arrow is flipped on X axis
							ArrowHead1DeltaX = -ArrowHead1DeltaX;
							ArrowHead2DeltaX = -ArrowHead2DeltaX;
							console.log("flip!");
						}
					}
					if (deltaY > 0) {
						if (ArrowHead1DeltaY > 0 && ArrowHead2DeltaY > 0) {
							//Arrow is flipped on Y axis
							ArrowHead1DeltaY = -ArrowHead1DeltaY;
							ArrowHead2DeltaY = -ArrowHead2DeltaY;
							console.log("flip!");
						}
					} else {
						if (ArrowHead1DeltaY < 0 && ArrowHead2DeltaY < 0) {
							//Arrow is flipped on Y axis
							ArrowHead1DeltaY = -ArrowHead1DeltaY;
							ArrowHead2DeltaY = -ArrowHead2DeltaY;
							console.log("flip!");
						}
					}
					
					console.log(ArrowRad + " - " + ArrowHead1Rad + ", " + ArrowHead2Rad);
					console.log("(" + ArrowHead1DeltaX + ", " + ArrowHead1DeltaY + "), (" + ArrowHead2DeltaX + ", " + ArrowHead2DeltaY + ")");
					
					//Add custom event to action with arrow head data
					this.action.events.push({
						x: x,
						y: y,
						ArrowHead1X: ArrowHead1DeltaX,
						ArrowHead1Y: ArrowHead1DeltaY,
						ArrowHead2X: ArrowHead2DeltaX,
						ArrowHead2Y: ArrowHead2DeltaY,
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
				//Draw line
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
//This tool is by cptconundrum with improvements by LavaSnake
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
			//Save image action with current image setting
            this.action.events[0] = ({
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

			//Draw image to canvas
            var context = this.context;
            var imageObj = new Image();
            imageObj.onload = function() {
				var OffsetX = imageObj.width / 2;
				var OffsetY = imageObj.height / 2;
                context.drawImage(imageObj, event.x - OffsetX, event.y - OffsetY);
            };
            imageObj.src = event.img;

            previous = event;
        }
        return this.context.stroke();
    }
};