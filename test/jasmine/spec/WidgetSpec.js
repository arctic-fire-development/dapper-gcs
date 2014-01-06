// The "require" call maps source code to symbols used to reference
// that source code as a module.
require([
    // Libraries

    // Models
    'Models/Platform', // source file, referenced as Platform
    'Models/RadioConnection',

    // Views
    'Views/Widgets/Altitude',
    'Views/Widgets/Battery',
    'Views/Widgets/Comms',
    'Views/Widgets/Gps',
    'Views/Widgets/Health',
    'Views/Widgets/Map',
    'Views/Widgets/SignalStrength',
    'Views/Widgets/Speed',
    'Views/Widgets/State'
], function(
    // Models
    Platform, // the symbol by which the Models/Platform code will be seen as a module
    RadioConnection,

    // Views
    altitudeWidget,
    batteryWidget,
    commsWidget,
    gpsWidget,
    healthWidget,
    mapWidget,
    signalStrengthWidget,
    speedWidget,
    stateWidget
) {

    describe("Altitude Widget", function() {

        beforeEach(function() {

            // Create a DOM element to render into
            setFixtures(sandbox({
                id: 'altitudeWidget'
            }));

            // Create a 'platform' Backbone model, which the view observes
            this.platform = new Platform();

            // Create the view we want to test
            this.altitudeWidget = new altitudeWidget({
                model: this.platform
            });

            // Render to the sandbox div
            this.altitudeWidget.render();

        });

        it("should display the altitude in the span.value element", function() {
            var renderedValue;

            this.altitudeWidget.model.set('alt', 13.5);
            renderedValue = $('#altitudeWidget span.value').text();
            expect(renderedValue).toBe('13.5');

            this.altitudeWidget.model.set('alt', 10.5);
            renderedValue = $('#altitudeWidget span.value').text();
            expect(renderedValue).toBe('10.5');
        });

        it("should round value to 1 decimal place", function() {
            var renderedValue;

            this.altitudeWidget.model.set('alt', 10.50);
            renderedValue = $('#altitudeWidget span.value').text();
            expect(renderedValue).toBe('10.5');

            this.altitudeWidget.model.set('alt', 10.54);
            renderedValue = $('#altitudeWidget span.value').text();
            expect(renderedValue).toBe('10.5');

            this.altitudeWidget.model.set('alt', 10.55);
            renderedValue = $('#altitudeWidget span.value').text();
            expect(renderedValue).toBe('10.6');

            this.altitudeWidget.model.set('alt', 10.59);
            renderedValue = $('#altitudeWidget span.value').text();
            expect(renderedValue).toBe('10.6');

            this.altitudeWidget.model.set('alt', 10.549);
            renderedValue = $('#altitudeWidget span.value').text();
            expect(renderedValue).toBe('10.5');

            this.altitudeWidget.model.set('alt', 10);
            renderedValue = $('#altitudeWidget span.value').text();
            expect(renderedValue).toBe('10.0');
        });

    });

    describe("Battery Widget", function() {

        beforeEach(function() {

            // Create a DOM element to render into
            setFixtures(sandbox({
                id: 'batteryWidget'
            }));

            // Create a 'platform' Backbone model, which the view observes
            this.platform = new Platform();

            // Create the view we want to test
            this.batteryWidget = new batteryWidget({
                model: this.platform
            });

            // Render to the sandbox div
            this.batteryWidget.render();

        });

        it("should display battery icon", function() {
            expect($('div#battery_image img').attr('src')).toContain('battery-empty.min.svg');
        });

        describe("Icon", function() {

            it("should be green when charge == 100%", function() {
                this.batteryWidget.model.set('battery_remaining', 100);
                expect($('div#battery_image img').attr('src')).toContain('battery-green.min.svg');
                //expect($('#battery_indicator').css("fill")).toEqual(97d7a6);
            });

            it("should be yellow when charge == 60%", function() {
                this.batteryWidget.model.set('battery_remaining', 60);
                expect($('div#battery_image img').attr('src')).toContain('battery-yellow.min.svg');
                //expect($('#battery_indicator').css("fill")).toEqual(0xf8f77e);
            });

            it("should be red when charge <= 30%", function() {
                this.batteryWidget.model.set('battery_remaining', 30);
                expect($('div#battery_image img').attr('src')).toContain('battery-red.min.svg');
                //expect($('#battery_indicator').css("fill")).toEqual(0xd72822);
                this.batteryWidget.model.set('battery_remaining', 10);
                expect($('div#battery_image img').attr('src')).toContain('battery-empty.min.svg');
                //expect($('#battery_indicator').css("fill")).toEqual(0xd72822);
            });
        });

        describe("Tooltip", function() {

            beforeEach(function() {
                $('#battery_image img').trigger('click');
            });

            it("should be shown when icon is clicked", function() {
                expect($('div.tool-container.gradient.tool-right.tool-rounded').css("display")).toBe('block');
            });

            it("should display current charge as percent", function() {
                this.batteryWidget.model.set('battery_remaining', 50);
                expect($('#battery_toolbar_display a.percentage span.value')
                    .text()).toBe('50');
                expect($('#battery_toolbar_display a.percentage span.units')
                    .text())
                    .toContain("%");
            });

            it("should display battery voltage", function() {
                this.batteryWidget.model.set('voltage_battery', 50000); //battery supplies value in miliVolts
                expect($('#battery_toolbar_display a.voltage span.value')
                    .text()).toBe('50');
                expect($('#battery_toolbar_display a.voltage span.units')
                    .text())
                    .toContain("V");
            });

            it("should display battery current", function() {
                this.batteryWidget.model.set('current_battery', 5000);
                expect($('#battery_toolbar_display a.current span.value')
                    .text()).toBe('-50');
                expect($('#battery_toolbar_display a.current span.units')
                    .text())
                    .toContain("A");
            });

        });
    });

    describe("GPS Widget", function(){
        beforeEach(function() {

            // Create a DOM element to render into
            setFixtures(sandbox({
                id: 'gpsWidget'
            }));

            // Create a 'platform' Backbone model, which the view observes
            this.platform = new Platform();

            // Create the view we want to test
            this.gpsWidget = new gpsWidget({
                model: this.platform
            });

            // Render to the sandbox div
            this.gpsWidget.render();

        });
    });
    // Signal strength widget shows the strength of the connection with the UAV
    describe("Signal Strength Widget", function() {

        beforeEach(function() {
            setFixtures(sandbox({
                id: 'signalStrengthWidget'
            }));

            this.connection = new RadioConnection();

            this.signalStrength = new signalStrengthWidget({
                model: this.connection
            });
            this.signalStrength.render();
        });

        it("should display no-signal icon when NOT connected", function() {
            this.signalStrength.model.set('connected', false);
            this.signalStrength.model.set('strength', 0);
            expect($('#signalStrengthWidget img').attr('src')).toContain('no-signal.min.svg');
            //expect($('#signalStrengthWidget img').prop('complete')).toBe(true);

            this.signalStrength.model.set('strength', 25);
            expect($('#signalStrengthWidget img').attr('src')).toContain('no-signal.min.svg');
            //expect($('#signalStrengthWidget img').prop('complete')).toBe(true);

            this.signalStrength.model.set('strength', 50);
            expect($('#signalStrengthWidget img').attr('src')).toContain('no-signal.min.svg');
            //expect($('#signalStrengthWidget img').prop('complete')).toBe(true);

            this.signalStrength.model.set('strength', 75);
            expect($('#signalStrengthWidget img').attr('src')).toContain('no-signal.min.svg');
            //expect($('#signalStrengthWidget img').prop('complete')).toBe(true);

            this.signalStrength.model.set('strength', 100);
            expect($('#signalStrengthWidget img').attr('src')).toContain('no-signal.min.svg');
            //expect($('#signalStrengthWidget img').prop('complete')).toBe(true);
        });

        describe("when connected:", function() {
            it("should display 4-bars icon when signal strength >= 90%", function() {
                this.signalStrength.model.set('connected', true);
                this.signalStrength.model.set('strength', 90);
                expect($('#signalStrengthWidget img').attr('src')).toContain('4-bars.min.svg');
                //expect($('#signalStrengthWidget img').prop('complete')).toBe(true);

                this.signalStrength.model.set('strength', 100);
                expect($('#signalStrengthWidget img').attr('src')).toContain('4-bars.min.svg');
                //expect($('#signalStrengthWidget img').prop('complete')).toBe(true);
            });

            it("should display 3-bars icon when 60% <= signal strength < 90%", function() {
                this.signalStrength.model.set('connected', true);
                this.signalStrength.model.set('strength', 89);
                expect($('#signalStrengthWidget img').attr('src')).toContain('3-bars.min.svg');
                //expect($('#signalStrengthWidget img').prop('complete')).toBe(true);

                this.signalStrength.model.set('strength', 75);
                expect($('#signalStrengthWidget img').attr('src')).toContain('3-bars.min.svg');
                //expect($('#signalStrengthWidget img').prop('complete')).toBe(true);

                this.signalStrength.model.set('strength', 60);
                expect($('#signalStrengthWidget img').attr('src')).toContain('3-bars.min.svg');
                //expect($('#signalStrengthWidget img').prop('complete')).toBe(true);
            });

            it("should display 2-bars icon when 30% <= signal strength < 60%", function() {
                this.signalStrength.model.set('connected', true);
                this.signalStrength.model.set('strength', 59);
                expect($('#signalStrengthWidget img').attr('src')).toContain('2-bars.min.svg');
                //expect($('#signalStrengthWidget img').prop('complete')).toBe(true);

                this.signalStrength.model.set('strength', 45);
                expect($('#signalStrengthWidget img').attr('src')).toContain('2-bars.min.svg');
                //expect($('#signalStrengthWidget img').prop('complete')).toBe(true);

                this.signalStrength.model.set('strength', 30);
                expect($('#signalStrengthWidget img').attr('src')).toContain('2-bars.min.svg');
                //expect($('#signalStrengthWidget img').prop('complete')).toBe(true);
            });

            it("should display 1-bar icon when 0% <= signal strength < 30%", function() {
                this.signalStrength.model.set('connected', true);
                this.signalStrength.model.set('strength', 29);
                expect($('#signalStrengthWidget img').attr('src')).toContain('1-bar.min.svg');
                //expect($('#signalStrengthWidget img').prop('complete')).toBe(true);

                this.signalStrength.model.set('strength', 15);
                expect($('#signalStrengthWidget img').attr('src')).toContain('1-bar.min.svg');
                //expect($('#signalStrengthWidget img').prop('complete')).toBe(true);

                this.signalStrength.model.set('strength', 0);
                expect($('#signalStrengthWidget img').attr('src')).toContain('1-bar.min.svg');
                //expect($('#signalStrengthWidget img').prop('complete')).toBe(true);
            });
        });
    });

    describe("Speed Widget", function() {

        // Setup function -- will execute before every test
        beforeEach(function() {

            // Create a DOM element to render into
            setFixtures(sandbox({
                id: 'speedWidget'
            }));

            // Create a 'platform' Backbone model, which the view observes
            this.platform = new Platform();

            // Create the view we want to test
            this.speedWidget = new speedWidget({
                model: this.platform
            });

            // Render to the sandbox div
            this.speedWidget.render();

        });

        it("should display the speed in the span.value element", function() {
            var renderedValue;

            this.speedWidget.model.set('groundspeed', 13);
            renderedValue = $('#speedWidget span.value').text();
            expect(renderedValue).toBe('13');

            this.speedWidget.model.set('groundspeed', 10);
            renderedValue = $('#speedWidget span.value').text();
            expect(renderedValue).toBe('10');
        });

        it("should round value to the nearest integer", function() {
            var renderedValue;

            this.speedWidget.model.set('groundspeed', 10.5);
            renderedValue = $('#speedWidget span.value').text();
            expect(renderedValue).toBe('11');

            this.speedWidget.model.set('groundspeed', 10.4);
            renderedValue = $('#speedWidget span.value').text();
            expect(renderedValue).toBe('10');

            this.speedWidget.model.set('groundspeed', 10.49);
            renderedValue = $('#speedWidget span.value').text();
            expect(renderedValue).toBe('10');

            this.speedWidget.model.set('groundspeed', 10.9);
            renderedValue = $('#speedWidget span.value').text();
            expect(renderedValue).toBe('11');

            this.speedWidget.model.set('groundspeed', 10.0);
            renderedValue = $('#speedWidget span.value').text();
            expect(renderedValue).toBe('10');

            this.speedWidget.model.set('groundspeed', 10);
            renderedValue = $('#speedWidget span.value').text();
            expect(renderedValue).toBe('10');
        });
    });

});