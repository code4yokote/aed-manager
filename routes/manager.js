/**
 * routes/api
 */
var express = require('express')
, Q = require('q')

module.exports = function(shared) {
	var ACS = shared.ACS, mw = shared.middlewares, settings = shared.settings

	, _login = function(callback, req, res) {
		ACS.Users.login({
			login: settings.manager.login,
			password: setting.manager.password
		}, callback, req, res);
	}

	, _logout = function(callback, req, res) {
		ACS.Users.logout(callback, req, res);
	}

	return express.Router()

	.use(mw.cors)

	.post('/event/create', function(req, res) {
		var session_id, data = req.body
		data.custom_fields = JSON.parse(data.custom_fields)
		_login(function(login) {
			data.session_id = login.meta.session_id
			ACS.Events.create(data, function(acsres){
				_logout(function(logout){
					res.send(JSON.stringify(acsres))
				}, req, res)
			}, req, res)
		}, req, res)
		// res.send(JSON.stringify(req.body));
	})

	// .get('/place/fix', function(req, res) {
	// 	var session_id, _ = require('underscore')

	// 	_login(function(login) {
	// 		ACS.Places.query({
	// 			where: '{"[CUSTOM_Cities]city_id": "52b29316b10e2b0b520010e9"}'
	// 			, sel: '{"all": ["id", "[CUSTOM_Cities]city_id"]}'
	// 			, limit: 1000
	// 		}, function(acsres) {
	// 			_(acsres.places).each(function(p) {
	// 				var pid = p.id
	// 				ACS.Places.update({
	// 					place_id: p.id
	// 					, custom_fields: {
	// 						'[CUSTOM_Cities]city_id': '52b29316b10e2b0b520010e9'
	// 					}
	// 					, session_id: login.meta.session_id
	// 				}, function(acsres){
	// 					console.log(acsres.places[0].id)
	// 				}, req, res)
	// 			})
	// 		})
	// 	}, req, res)
	// })
}

