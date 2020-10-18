var myApp = angular.module('myApp');

myApp.controller('CirclesController', ['$scope', '$http', '$location', '$routeParams', function($scope, $http, $location, $routeParams){
	console.log('CirclesController loaded...');

	$scope.getCircles = function(){
		$http.get('/api/Circles').success(function(response){
			$scope.Circles = response;
		});
	}

	$scope.getCircle = function(){
		var id = $routeParams.id;
		$http.get('/api/Circles/'+id).success(function(response){
			$scope.Circle = response;
		});
	}

	$scope.addCircle = function(){
		console.log($scope.Circle);
		$http.post('/api/Circles/', $scope.Circle).success(function(response){
			window.location.href='#/Circles';
		});
	}

	$scope.updateCircle = function(){
		var id = $routeParams.id;
		$http.put('/api/Circles/'+id, $scope.Circle).success(function(response){
			window.location.href='#/Circles';
		});
	}

	$scope.removeCircle = function(id){
		$http.delete('/api/Circles/'+id).success(function(response){
			window.location.href='#/Circles';
		});
	}
}]);