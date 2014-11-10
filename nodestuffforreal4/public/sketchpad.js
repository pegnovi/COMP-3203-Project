function Sketchpad(ctx) {
	var x				= 0,
		y				= 0,
		lines			= new LinkedList(),
		currLine		= new LinkedList(),
		currColor		= '#000',
		currWidth		= 3,
		mouseDown		= false,
		counter			= 0;

	ctx.lineCap     = 'round';

	ctx.canvas.addEventListener('mousedown', function(e) {
		var mousePos = getMousePos(e);
		x            = mousePos.x;
		y            = mousePos.y;
		mouseDown    = true;

		currLine.pushFront({
			x: mousePos.x,
			y: mousePos.y
		});
	});

	ctx.canvas.addEventListener('mouseup', function(e) {
		mouseMove(e, true);
		addCurrLine();
		currLine  = new LinkedList();
		mouseDown = false;
		counter   = 0;
	});

	ctx.canvas.addEventListener('mousemove', function(e){mouseMove(e)});

	function mouseMove(e, lineEnd) {
		if(mouseDown) {
			++counter;
			var mousePos = getMousePos(e);

			drawLine(x, y, mousePos.x, mousePos.y, currColor, currWidth);

			x = mousePos.x;
			y = mousePos.y;

			//if(counter%2 == 0 || lineEnd) {
			if(1) {
				currLine.pushFront({
					x: mousePos.x,
					y: mousePos.y
				});
			}
		}
	}

	function drawLine(x1, y1, x2, y2, color, lineWidth) {
		ctx.beginPath();
		ctx.lineWidth   = lineWidth;
		ctx.strokeStyle = color;
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
	}

	function addPoint(x, y) {
		currLine.pushFront(x, y);
	}

	function addCurrLine() {
		lines.pushFront({
			line: currLine,
			color: currColor,
			width: currWidth
		});
	}

	function redraw() {
		if(currLine.getSize() > 1) {
			var oldPoint = currLine.peekFront();
			addCurrLine();
			currLine = new LinkedList();
			currLine.pushFront(oldPoint);
		}

		clear();
		var bigSize = lines.getSize();

		for(var i = 0; i < bigSize; ++i) {
			var container 	= lines.popEnd(),
				line		= container.line,
				lineColor	= container.color,
				lineWidth 	= container.width,
				smallSize	= line.getSize();
				oldPos 		= line.popEnd();

			drawLine(oldPos.x, oldPos.y, oldPos.x, oldPos.y, lineColor, lineWidth);

			for(var j = 1; j < smallSize; ++j) {
				var pos = line.popEnd();
				drawLine(oldPos.x, oldPos.y, pos.x, pos.y, lineColor, lineWidth);
				oldPos = pos;
			}
		}	
	}

	function clear() {
		ctx.clearRect(0,0,ctx.canvas.width, ctx.canvas.height);
	}

	function toArray() {
		if(currLine.getSize() > 1) {
			var oldPoint = currLine.peekFront();
			addCurrLine();
			currLine = new LinkedList();
			currLine.pushFront(oldPoint);
		}
	
		var bigSize = lines.getSize();
		if(bigSize < 1)
			return new Array(0);
			
		var bigArray = new Array(bigSize-1);

		for(var i = 0; i < bigSize; ++i) {
			var container	= lines.popEnd(),
				line		= container.line,
				smallSize	= line.getSize(),
				smallArray	= new Array(smallSize-1);

			bigArray[i] = {
				line: smallArray,
				color: container.color,
				width: container.width
			};

			for(var j = 0; j < smallSize; ++j) {
				smallArray[j] = line.popEnd();
			}
		}

		return bigArray;	
	}
	
	function drawFromArray(array) {
		for(var i = 0; i < array.length; ++i) {
			var color = array[i].color;
			var width = array[i].width;
			var line = array[i].line;
			
			for(var j = 0; j < line.length - 1; ++j) {
				drawLine(line[j].x, line[j].y, line[j+1].x, line[j+1].y, color, width);
			}
		}
	}

	function getMousePos(e) {
		return {
			x: e.pageX - ctx.canvas.offsetLeft,
			y: e.pageY - ctx.canvas.offsetTop
		}
	}

	function setColor(color) {
		currColor = color;
	}

	function setWidth(width) {
		currWidth = width;
	}

	return {
		toArray: toArray,
		setColor: setColor,
		setWidth: setWidth,
		drawFromArray: drawFromArray,
	};
}