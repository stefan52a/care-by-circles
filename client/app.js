var myApp = angular.module('myApp',['ngRoute']);

myApp.config(function($routeProvider){
	$routeProvider.when('/', {
		controller:'CirclesController',
		templateUrl: 'views/Circles.html'
	})
	.when('/Circles', {
		controller:'CirclesController',
		templateUrl: 'views/Circles.html'
	})
	.when('/Circles/details/:id',{
		controller:'CirclesController',
		templateUrl: 'views/Circle_details.html'
	})
	.when('/Circles/add',{
		controller:'CirclesController',
		templateUrl: 'views/add_Circle.html'
	})
	.when('/Circles/edit/:id',{
		controller:'CirclesController',
		templateUrl: 'views/edit_Circle.html'
	})
	.otherwise({
		redirectTo: '/'
	});
});