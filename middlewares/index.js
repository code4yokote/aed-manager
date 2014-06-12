module.exports = {
	cors: function(req, res, next) {
		var allowOrigins = [
			'http://192.168.0.37:3000'
			, 'http://aed-client.herokuapp.com'
		]
		, origin = req.headers.origin

		if(allowOrigins.indexOf(origin) >= 0) {
			res.set('Access-Control-Allow-Origin', origin)
			res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
			res.set('Access-Control-Allow-Headers', 'X-Requested-With')
		}
		next()
	}
}
