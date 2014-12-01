/**
 * Module definition and dependencies
 */
angular.module('ngGo.Board.Layer.Directive', [
	'ngGo.Board.Layer.Service',
	'ngGo.Board.Layer.GridLayer.Service',
	'ngGo.Board.Layer.ShadowLayer.Service'
])

/**
 * Directive definition
 */
.directive('boardlayer', function($injector) {
	return {
		restrict: 'E',
		template: '<canvas></canvas>',
		link: function($scope, element, attrs) {

			//Get name and type of layer
			var name = attrs.class || '',
				type = attrs.layerType || 'board',
				pixelRatio = window.pixelRatio || 1;

			//Get canvas element and context
			var canvas = element.find('canvas'),
				context = canvas[0].getContext('2d');

			//Scale context depending on pixel ratio
			if (pixelRatio > 1) {
				context.scale(pixelRatio, pixelRatio);
			}

			//Listen for board resize events
			$scope.$on('ngGo.board.resize', function(event, width, height) {
				canvas.attr('width', width * pixelRatio);
				canvas.attr('height', height * pixelRatio);
				canvas.css({
					width: width,
					height: height
				});
			});

			//Add layer to board
			type = type.charAt(0).toUpperCase() + type.substr(1) + 'Layer';
			if ($injector.has(type)) {
				var boardLayer = $injector.get(type);
				$scope.Board.layers[name] = new boardLayer($scope.Board, context);
			}
		}
	};
});