'use strict';

/**
 * @ngdoc function
 * @name angularJsDirectiveControllersApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the angularJsDirectiveControllersApp
 */
angular.module('angularJsDirectiveControllersApp')
  .controller('MainCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });
