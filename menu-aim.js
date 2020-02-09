const pluginName = 'menuAim';

const defaults = {
    triggerEvent: "hover",
    rowSelector: "> li",
    handle: "> a",
    submenuSelector: "*",

    submenuDirection: "right",

    openClassName: "open",

    tolerance: 75,
    activationDelay: 300,
    mouseLocsTracked: 3,
    defaultDelay: 300,

    enterCallback: new Function(),

    activateCallback: new Function(),

    deactivateCallback: new Function(),
    exitCallback: new Function(),
    exitMenuCallback: new Function()
};

class MenuAim {
    constructor(element, options) {
        this.el = element;
        this.child = [...element.children] || false;

        this.options = {...defaults, ...options};

        this._name = pluginName;

        this.activeRow = null;
        this.mouseLocs = [];
        this.lastDelayLoc = null;
        this.timeoutId = null;
        this.openDelayId = null;

        this.init();
    }

    init() {
        this._initEvents();
    }

    _initEvents() {
        this._hoverTriggerOn();
        this._hoverTriggerOff();
    }

    _hoverTriggerOn() {
        this.el.addEventListener('mouseleave', this._mouseLeaveMenu.bind(this, this.el));

        this.child.forEach((element) => {
            element.addEventListener('mouseenter', this._mouseEnterRow.bind(this, element))
            element.addEventListener('mouseleave', this._mouseLeaveRow.bind(this, element))
        });

        document.addEventListener('mousemove', this._mouseMoveDocument.bind(this));
    }

    _hoverTriggerOff() {
        this.el.removeEventListener('mouseleave', this._mouseLeaveMenu.bind(this, this.el));

        this.child.forEach((element) => {
            element.removeEventListener('mouseenter', this._mouseEnterRow.bind(this, element))
            element.removeEventListener('mouseleave', this._mouseLeaveRow.bind(this, element))
        });

        document.removeEventListener('mousemove', this._mouseMoveDocument.bind(this));
    }


    /**
     *
     * @param {Object} event handler
     *
     * @private
     */

    _mouseMoveDocument(event) {
        this.mouseLocs.push({
            x: event.pageX,
            y: event.pageY
        });

        if(this.mouseLocs.length > this.options.mouseLocsTracked) {
            this.mouseLocs.shift();
        }
    }

    _mouseLeaveMenu(self, event) {
        if(this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        if(this.openDelayId) {
            clearTimeout(this.openDelayId);
        }

        this._possiblyDeactivate(this.activeRow);
        this.options.exitMenuCallback(self);
    }

    _mouseEnterRow(self, event) {

        if(this.timeoutId) {
            clearTimeout(this.timeoutId)
        }

        this.options.enterCallback(self);
        this._possiblyActivate(self);

    }

    _mouseLeaveRow(self, event) {
        this.options.exitCallback(self);
    }

    _activate(row) {
        const self = this;

        if(row === this.activeRow) return;

        if(this.openDelayId) {
            clearTimeout(this.openDelayId)
        }

        if(this.activeRow) {
            this._activateWithoutDelay(row);
        } else {
            this.openDelayId = setTimeout(function () {
                self._activateWithoutDelay(row);
            }, this.options.activationDelay);
        }
    }

    _activateWithoutDelay(row) {
        if(this.activeRow) {
            this.options.deactivateCallback(this.activeRow)
        }

        this.options.activateCallback(row);
        this.activeRow = row;
    }

    _deactivate() {
        if(this.openDelayId) {
            clearTimeout(this.openDelayId)
        }
        if(this.activeRow) {
            this.options.deactivateCallback(this.activeRow);
            this.activeRow = null;
        }
    }

    _possiblyActivate(row) {
        let delay = this._activationDelay();
        let self = this;

        if(delay) {
            this.timeoutId = setTimeout(function () {
                self._possiblyActivate(row)
            }, delay)
        } else {
            this._activate(row)
        }
    }

    _possiblyDeactivate(row) {
        let delay = this._activationDelay();
        let self = this;

        if(delay) {
            this.timeoutId = setTimeout(function () {
                self._possiblyDeactivate(row)
            }, delay)
        } else {
            this.options.deactivateCallback(row);
            this.activeRow = null;
        }

    }


    _activationDelay() {

        if(!this.activeRow) return;

        let offset = this.el.getBoundingClientRect();
        let upperLeft = {
            x: offset.left,
            y: offset.top - this.options.tolerance
        };
        let upperRight = {
            x: offset.left + this.el.offsetWidth,
            y: upperLeft.y
        };
        let lowerLeft = {
            x: offset.left,
            y: offset.top + this.el.offsetHeight + this.options.tolerance
        };
        let lowerRight = {
            x: offset.left + this.el.offsetWidth,
            y: lowerLeft.y
        };

        let loc = this.mouseLocs[this.mouseLocs.length - 1];
        let prevLoc = this.mouseLocs[0];

        if(!loc) return;

        if(!prevLoc) prevLoc = loc;

        if(prevLoc.x < offset.left || prevLoc.x > lowerRight.x ||
            prevLoc.y < offset.top || prevLoc.y > lowerRight.y) {

            return false;
        }

        if(this.lastDelayLoc &&
            loc.x == this.lastDelayLoc.x &&
            loc.y == this.lastDelayLoc.y) {
            return false;
        }

        function slope(a, b) {
            return (b.y - a.y) / (b.x - a.x);
        }

        let decreasingCorner = upperRight;
        let increasingCorner = lowerRight;

        if(this.options.submenuDirection === "left") {
            decreasingCorner = lowerLeft;
            increasingCorner = upperLeft;
        } else if(this.options.submenuDirection === "below") {
            decreasingCorner = lowerRight;
            increasingCorner = lowerLeft;
        } else if(this.options.submenuDirection === "above") {
            decreasingCorner = upperLeft;
            increasingCorner = upperRight;
        }

        let decreasingSlope = slope(loc, decreasingCorner);
        let increasingSlope = slope(loc, increasingCorner);
        let prevDecreasingSlope = slope(prevLoc, decreasingCorner);
        let prevIncreasingSlope = slope(prevLoc, increasingCorner);

        if(decreasingSlope < prevDecreasingSlope && increasingSlope > prevIncreasingSlope) {
            this.lastDelayLoc = loc;
            return this.options.defaultDelay;
        }

        this.lastDelayLoc = null;
        return false;
    }
}

let elements = Array.from(
    document.querySelectorAll('.js-list')
);

elements.forEach((element) => {
    new MenuAim(element, {
        activateCallback: activate,
        deactivateCallback: deactivate,
        openClassName: '.is-hover',
        activationDelay: 0
    });
});

function activate(row) {
    row.classList.add('is-hover');
}

function deactivate(row) {
    row.classList.remove('is-hover')
}