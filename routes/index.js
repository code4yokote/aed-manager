/**
 * routes/index
 */
var express = require("express")
, Q = require('q')

module.exports = function(shared){
	var ACS = shared.ACS

	return express.Router()

	.get('/', function(req, res){
		var sessionId = req.cookies ? req.cookies._session_id : null
		, authorized = sessionId ? true : false
		, getUser = function() {// promise login user data
			var deferred = Q.defer()
			ACS.Users.showMe(function (e) {
				deferred.resolve(e.success ? e.users[0] : null)
			}, req, res)
			return deferred.promise
		}

		Q.fcall(getUser)
		.then(function(user) {
			res.render('index', {authorized: authorized, user: user})
		})
	})
}