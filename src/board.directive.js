/**
 * Module definition and dependencies
 */
angular.module('ngGo.Board.Directive', [
	'ngGo.Board.Service'
])

/**
 * Directive definition
 */
.directive('board', function($window, Board) {

	//Get pixel ratio
	var pixelRatio = window.pixelRatio || 1;

	/**
	 * Helper to create a layer canvas
	 */
	var createLayerCanvas = function(name) {

		//Create canvas element and get context
		var canvas = document.createElement('canvas'),
			context = canvas.getContext('2d');

		//Scale context depending on pixel ratio
		if (pixelRatio > 1) {
			context.scale(pixelRatio, pixelRatio);
		}

		//Set class
		canvas.className = name;

		//Set initial canvas width/height based on our own size
		canvas.width = this.clientWidth * pixelRatio;
		canvas.height = this.clientHeight * pixelRatio;

		//Append to element now and return context
		this.appendChild(canvas);
		return context;
	};

	/**
	 * Helper to determine draw size
	 */
	var determineDrawSize = function(scope, availableWidth, availableHeight) {

		//Init vars
		var drawWidth, drawHeight, cellSize;

		//Grid size known?
		if (scope.Board.width && scope.Board.height) {

			//Determine smallest cell size
			cellSize = Math.min(availableWidth / scope.Board.width, availableHeight / scope.Board.height);

			//Set draw size
			drawWidth = Math.floor(cellSize * scope.Board.width);
			drawHeight = Math.floor(cellSize * scope.Board.height);
		}

		//Otherwise, use the lesser of the available width/height
		else {
			drawWidth = drawHeight = Math.min(availableWidth, availableHeight);
		}

		//Broadcast new size if changed
		if (scope.lastDrawWidth != drawWidth || scope.lastDrawHeight != drawHeight) {
			scope.lastDrawWidth = drawWidth;
			scope.lastDrawHeight = drawHeight;
			scope.$broadcast('ngGo.board.drawSizeChanged', drawWidth, drawHeight);
			return true;
		}

		//No change
		return false;
	};

	/**
	 * Directive
	 */
	return {
		restrict:	'E',
		scope:		{
			instance: '&'
		},

		/**
		 * Linking function
		 */
		link: function(scope, element, attrs) {

			//Init vars
			var i, context, layer, parent, playerElement,
				existingInstance = true;

			//Remember last draw width/height
			scope.lastDrawWidth = 0;
			scope.lastDrawHeight = 0;

			//Get board instance
			scope.Board = scope.instance();

			//Function given?
			if (typeof scope.Board == 'function') {
				scope.Board = scope.Board();
			}

			//Instantiate board if not present in scope
			if (!scope.Board) {
				existingInstance = false;
				scope.Board = new Board();
			}

			//Link element
			scope.Board.linkElement(element);

			//Find player element
			parent = element.parent();
			if (parent[0].tagName == 'PLAYER') {
				playerElement = parent;
			}

			//Listen for board drawsize events
			scope.$on('ngGo.board.drawSizeChanged', function(event, width, height) {

				//First set the new dimensions on the canvas elements
				var canvas = element.find('canvas');
				for (i = 0; i < canvas.length; i++) {
					canvas[i].width = width * pixelRatio;
					canvas[i].height = height * pixelRatio;
				}

				//Next set it on the board itself
				element.css({width: width + 'px', height: height + 'px'});
				scope.Board.setDrawSize(width * pixelRatio, height * pixelRatio);
			});

			//On board grid resize, determine the draw size again
			scope.$on('ngGo.board.resize', function(event, board, width, height) {

				//Only relevent if this was our own board
				if (board != scope.Board) {
					return;
				}

				//If the draw size didn't change, the draw size event won't be triggered.
				//However, that means we should call the resized() method now manually because
				//it won't be called with the setDrawSize() call.
				//This may seem a bit "off", but it's the best way to prevent redundant redraws.
				if (!determineDrawSize(scope, parent[0].clientWidth, parent[0].clientHeight)) {
					scope.Board.resized();
				}
			});

			//Board with player element?
			if (playerElement) {

				//Get player element parent
				parent = parent.parent();

				//Determine draw size based on parent
				determineDrawSize(scope, parent[0].clientWidth, parent[0].clientHeight);

				//On window resize, determine the draw size again
				angular.element($window).on('resize', function() {
					determineDrawSize(scope, parent[0].clientWidth, parent[0].clientHeight);
				});
			}

			//Board without player
			else {

				//Determine draw size based on element dimensions
				determineDrawSize(scope, element[0].clientWidth, element[0].clientHeight);

				//On window resize, determine the draw size again
				angular.element($window).on('resize', function() {
					determineDrawSize(scope, element[0].clientWidth, element[0].clientHeight);
				});
			}

			//Static board
			if (attrs.static && attrs.static === 'true') {

				//Add static class and make the board static
				element.addClass('static');
				scope.Board.makeStatic();

				//Create single canvas and link to all relevant layer service classes
				context = createLayerCanvas.call(element[0], 'static');
				for (i = 0; i < scope.Board.layerOrder.length; i++) {
					layer = scope.Board.layerOrder[i];
					scope.Board.layers[layer].setContext(context);
				}
			}

			//Dynamic board
			else {

				//Create individual layer canvasses and link the canvas context to the layer service class
				for (i = 0; i < scope.Board.layerOrder.length; i++) {
					layer = scope.Board.layerOrder[i];
					context = createLayerCanvas.call(element[0], layer);
					scope.Board.layers[layer].setContext(context);
				}
			}

			//Observe the board size attribute
			attrs.$observe('size', function(size) {
				if (typeof size == 'string' && size.toLowerCase().indexOf('x') !== -1) {
					size = size.split('x');
					scope.Board.setSize(size[0], size[1]);
				}
				else {
					scope.Board.setSize(size, size);
				}
			});

			//Observe the coordinates attribute
			attrs.$observe('coordinates', function(attr) {
				scope.Board.toggleCoordinates(attr === 'true');
			});

			//Observe the cutoff attribute
			attrs.$observe('cutoff', function(attr) {
				scope.Board.setCutoff(attr.split(','));
			});

			//Observe color multiplier
			attrs.$observe('colorMultiplier', function(attr) {
				scope.Board.swapColors(attr);
			});

			//Link board to player if present in parent scope
			if (scope.$parent.Player) {
				scope.$parent.Player.setBoard(scope.Board);
			}

			//Redraw board if we had an existing instance (it might contain data)
			if (existingInstance) {
				scope.Board.redraw();
			}
		}
	};
});