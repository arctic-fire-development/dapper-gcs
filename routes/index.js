/*
 * GET home page.
 */

exports.index = function(req, res) {
    res.render('index', {
        title: 'DapperGCS',
        platforms: req.app.get('platforms'),
        missions: req.app.get('missions'),
        mapProxyUrl: req.app.get('config').get('mapproxy:url'),
        APM: req.app.get('APM'),
        bypassGps: req.app.get('config').get('tcp:sitl:bypassGps')
    });
};

exports.checklist = function(req, res) {
    res.render('checklist', {
        title: 'Drone Flight Equipment Checklist'
    });
};

exports.unsupported = function(req, res) {
    res.render('unsupported', {
        title: 'Unsupported browser'
    });
};
