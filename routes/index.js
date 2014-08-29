/*
 * GET home page.
 */

exports.index = function(req, res) {
    res.render('index', {
        title: 'DapperGCS',
        platforms: req.app.get('platforms')
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