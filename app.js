/**
 * Module dependencies.
 */

var express = require('express')
, routes = {}
, http = require('http')
, path = require('path')
, fs = require('fs')

, favicon = require('serve-favicon')
, bodyParser = require('body-parser')
, cookieParser = require('cookie-parser')
, methodOverride = require('method-override')
, logger = require('morgan')

, app = express()
, server = http.createServer(app)

/**
 *  shared modules
 */
, shared = {
	settings: require('./settings.json')
	, ACS: require('acs-node')
	, io: require('socket.io').listen(server)
	, middlewares: require('./middlewares')
}
shared.ACS.init(shared.settings.apiKey)

/**
 * all environments
 */
app.set('port', process.env.PORT || 3003);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
// app.use(favicon('./favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser());
app.use(methodOverride());
// app.use(express.bodyParser({uploadDir: './tmp'}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * routes
 */
fs.readdirSync('./routes').forEach(function(file){
	var routePath = '/' + file.substr(0, file.indexOf('.'))
	if(routePath == '/index') routePath = '/'
	// console.log(name,require('./routes/' + name))
	app.use(routePath, require('./routes' + routePath)(shared))
})

/**
 * error handler
 */
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

/**
 * server
 */
server.listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});
