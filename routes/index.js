/*
 * GET home page.
 */

exports.index = function(req, res) {
    res.render('index', {
        title: 'DapperGCS',
        platforms: req.app.get('platforms')
    });
};