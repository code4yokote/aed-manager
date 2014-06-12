/**
 * routes/api
 */
var express = require("express")

module.exports = function(shared) {
	var ACS = shared.ACS, mw = shared.middlewares

	return express.Router()

	.use(mw.cors)

	.get('/city', function(req, res) {
		var data = req.query

		console.log(req.query)
		data.classname = "Cities"
		// data.custom_fields = JSON.parse(data.custom_fields);
		ACS.Objects.query(data, function(acsres){
			if(acsres.success) {
				res.send(JSON.stringify(acsres))
			} else {
				res.send(500)
			}
		}, req, res)
	})

	.get('/event', function(req, res) {
		var data = req.query

		console.log(req.query)
		// data.custom_fields = JSON.parse(data.custom_fields);
		ACS.Events.query(data, function(acsres){
			if(acsres.success) {
				res.send(JSON.stringify(acsres))
			} else {
				res.send(500)
			}
		}, req, res)
	})

	.put('/event', function(req, res) {
		var sessionId = req.cookies ? req.cookies._session_id : null
		, data = req.body

		data.custom_fields = JSON.parse(data.custom_fields);

		if(sessionId) {
			ACS.Events.update(data, function(acsres){
				if(acsres.success) {
					res.send(JSON.stringify(acsres))
				} else {
					res.send(500)
				}
			}, req, res)
		} else {
			res.send(401)
		}
	})
}
