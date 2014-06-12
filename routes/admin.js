/**
 * routes/admin
 */
var express = require("express")

module.exports = function(shared) {
	var ACS = shared.ACS

	return express.Router()

	.get('/login', function(req, res) {
		res.render('login', { title: 'Welcome to Node.ACS!' });
	})

	.post('/authorize', function(req, res) {
		ACS.Users.login(req.body, function(acsres){
			console.log(acsres)
			if(acsres.success){
				res.redirect("/")
			} else {
				res.redirect("./")
			}
		}, req, res);
	})

	.get('/logout', function(req, res) {
		ACS.Users.logout(function(logout){
			res.redirect("/")
		}, req, res)
	})
}
