/*
 * GET home page.
 */

exports.index = function(req, res) {
    res.render('index', {
        title: 'DapperGCS',
        platforms: req.app.get('platforms'),
        mapProxyUrl: req.app.get('config').get('mapproxy:url'),
        APM: req.app.get('APM')
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
