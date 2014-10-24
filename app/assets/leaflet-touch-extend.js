'use strict';
/* global L */
// This extension is modified from:
// https://github.com/Leaflet/Leaflet/issues/1542
L.Map.mergeOptions({
    touchExtend: true
});

L.Map.TouchExtend = L.Handler.extend({
    initialize: function(map) {
        this._map = map;
        this._container = map._container;
        return this._pane = map._panes.overlayPane;
    },
    addHooks: function() {
        L.DomEvent.on(this._container, 'touchstart', this._onTouchStart, this);
        L.DomEvent.on(this._container, 'touchend', this._onTouchEnd, this);
        return L.DomEvent.on(this._container, 'touchmove', this._onTouchMove, this);
    },
    removeHooks: function() {
        L.DomEvent.off(this._container, 'touchstart', this._onTouchStart);
        L.DomEvent.off(this._container, 'touchend', this._onTouchEnd);
        return L.DomEvent.off(this._container, 'touchmove', this._onTouchMove);
    },
    _onTouchEvent: function(e, type) {
        if (!this._map._loaded) {
            return;
        }
        return this._map.fire(type, {
            latlng: this._map.mouseEventToLatLng(e.touches[0]),
            layerPoint: this._map.mouseEventToLayerPoint(e.touches[0]),
            containerPoint: this._map.mouseEventToContainerPoint(e.touches[0]),
            originalEvent: e
        });
    },
    _onTouchStart: function(e) {
        return this._onTouchEvent(e, 'touchstart');
    },
    _onTouchEnd: function(e) {
        if (!this._map._loaded) {
            return;
        }
        return this._map.fire('touchend', {
            originalEvent: e
        });
    },
    _onTouchMove: function(e) {
        return this._onTouchEvent(e, 'touchmove');
    }
});

L.Map.addInitHook('addHandler', 'touchExtend', L.Map.TouchExtend);
