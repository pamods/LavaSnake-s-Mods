var model;
var handlers = {};
var date = new Date();

$(document).ready(function () {

    api.game.releaseKeyboard(true);

    var start = /[^\/]*$/;  // ^ : start , \/ : '/', $ : end // as wildcard: /*.json 
    var end = /[.]json$/; 

    function DiplomaticStateItemModel(state, allianceRequestTime, name, color, id, defeated) {
        var self = this;
        self.state = ko.observable(state);
        self.allianceRequestTime = ko.observable(allianceRequestTime);
        self.name = ko.observable(name);
        self.color = ko.observable(color);
        self.id = ko.observable(id);
        self.defeated = ko.observable(defeated);
        self.isNeutral = ko.computed(function () { return self.state() === "neutral"; });
        self.isHostile = ko.computed(function () { return self.state() === "hostile"; });
        self.isAlly = ko.computed(function () { return self.state() === "allied" || self.state() === "alliedShared"; });
        self.isEconomySharing = ko.computed(function () { self.state() === "alliedShared"; });
        self.setDiplomaticState = function (targetArmyid, state) { model.send_message('change_diplomatic_state', { targetArmyId: targetArmyid, state: state }); };
    }

    function UnitAlertModel() {
        var self = this;
        var timeout = 10000;

        self.map = {};
        self.signalRecalculate = ko.observable();
        self.focusId = ko.observable(-1);

        self.clean = function () {
            var current_time = _.now();
            var dirty = false;
            var id;

            for (id in self.map) {
                if (current_time - self.map[id].time > timeout) {
                    dirty = true;
                    delete self.map[id];
                }
            }

            if (dirty)
                self.signalRecalculate.notifySubscribers();

            self.hidePreview();
        }

        self.alerts = ko.computed(function () {
            self.signalRecalculate(); /* force dependency */
            return _.sortBy(_.values(self.map), function (v) { return -v.time });
        });

        self.showLabel = function (id, index) {
            if (id === self.focusId())
                return true;
            return self.focusId() === -1 && index === 0;
        }

        self.setFocus = function (id) {
            if (self.focusId() !== id)
                self.focusId(id);
        }

        self.clearFocus = function () {
            if (self.focusId() !== -1)
                self.focusId(-1);
        }

        self.close = function (id) {
            delete self.map[id];
            if (self.focusId() === id)
                self.focusId(-1);
            self.signalRecalculate.notifySubscribers();
            self.hidePreview();
        }

        self.acknowledge = function (id) {
   
            var alert = self.map[id];
            var target = {
                location: alert.location,
                planet_id: alert.planet_id
            };

            engine.call('camera.lookAt', JSON.stringify(target));

            self.close(id);
        }

        self.processList = function (array) {
            //console.log(array);
            var dirty = false;
            var target;
            array.forEach(function (element, index, array) {
                if (!self.map[element.id])
                    dirty = true;

                self.map[element.id] = element;
                element.time = _.now();
                if (element.watch_type === 3) /* ping */
                {
                    element.name = "";
                    element.sicon = 'coui://ui/main/atlas/icon_atlas/img/strategic_icons/icon_si_ping.png';
                }
                else
                {
                    element.name = model.itemDetails[element.spec_id].name();
                    element.sicon = 'coui://ui/main/atlas/icon_atlas/img/strategic_icons/icon_si_' + model.itemDetails[element.spec_id].sicon() + '.png';
                }

                if (element.watch_type === 1) /* commmander */
                    model.armyAlertModel.commanderUnderAttackAlert.test(model.commanderHealth());
            });

            /* trigger update only if there was a new alert */
            if (dirty)
                self.signalRecalculate.notifySubscribers();

            setTimeout(self.clean, timeout + 1);
        }
        
        self.showPreview = function(id) {
            var alert = self.map[id];
            var target = {
                location: alert.location,
                planet_id: alert.planet_id,
                zoom: 'surface'
            };

            model.preview.$div.show();
            model.preview.update();
            
            // Delay fixes issues with intial frame camera setup vs focus problems
            _.delay(function() {
                var focused = api.Holodeck.focused;
                model.preview.focus();
                api.camera.lookAt(JSON.stringify(target));
                if (focused)
                    focused.focus();
            }, 30);
        };
        
        self.hidePreview = function() {
            model.preview.$div.hide();
            model.preview.update();
        };
    }

    function BuildItemModel(unit, count, current) {
        var self = this;
        self.id = ko.observable(unit.id);
        self.icon = ko.observable(unit.buildIcon);
        self.count = ko.observable(count)
        self.current = ko.observable(current);
        self.isStructure = ko.observable(unit.buildStructure);
    }

    function UnitDetailModel(name, desc, cost, sicon) {
        var self = this;
        self.name = ko.observable(name);
        self.desc = ko.observable(desc);
        self.cost = ko.observable(cost);
        self.sicon = ko.observable(sicon);
    }

    function AlertSoundModel(options /* audio threshold reset */) {

        var self = this;

        var audio = options.audio;
        var threshold = options.threshold;
        var resetTime = options.reset;
        var lastPlayTime = 0;

        function play () { api.audio.playSound(audio); }

        function trigger() {
            console.log(audio);
            var now = _.now();
            if (now - lastPlayTime > resetTime)
                play();

            lastPlayTime = now;
        }

        self.test = function (value) {
            //console.log(audio + ' '+ value + ' ' + threshold);
            if (value < threshold)
                trigger();
        }
    }

    function ArmyAlertModel() {
        var self = this;

        var alertDelay = 10 * 1000; /* in ms */
        var startTime = 0;

        var prevArmySize = 0;
        var prevArmySampleTime = 0;
        var armySampleInterval = 5 * 1000; /* in ms */

        self.hasStarted = ko.observable(false);
        self.hasStarted.subscribe(function () {
            startTime = _.now();
        });

        self.lowMetalAlert = new AlertSoundModel({
            audio: '/SE/UI/UI_Alert_metal_low',
            threshold: 0.2,
            reset: 60 * 1000 /* in ms */
        });
        self.lowEnergyAlert = new AlertSoundModel({
            audio: '/SE/UI/UI_Alert_energy_low',
            threshold: 0.2,
            reset: 60 * 1000 /* in ms */
        });
        self.underAttackAlert = new AlertSoundModel({
            audio: '/SE/UI/UI_under_attack',
            threshold: -0.05,
            reset: 60 * 1000 /* in ms */
        });
        self.commanderUnderAttackAlert = new AlertSoundModel({
            audio: '/SE/UI/UI_commander_under_attack',
            threshold: 0.9,
            reset: 60 * 1000 /* in ms */
        });
        self.commanderLowHealthAlert = new AlertSoundModel({
            audio: '/SE/UI/UI_commander_low_health',
            threshold: 0.3,
            reset: 60 * 1000 /* in ms */
        });

        self.update = function (model) {
            var now = _.now()

            if (!self.hasStarted() || now - startTime < alertDelay)
                return;

            self.lowMetalAlert.test(model.metalFraction());
            self.lowEnergyAlert.test(model.energyFraction());
            /* commanderUnderAttackAlert tested in UnitAlertModel */
            self.commanderLowHealthAlert.test(model.commanderHealth());

            if (now - prevArmySampleTime > armySampleInterval) {

                var d = (model.armySize() - prevArmySize) / model.armySize();
                self.underAttackAlert.test(d);

                prevArmySampleTime = now;            
                prevArmySize = model.armySize();            
            }
        }
    }

    function CelestialViewModel(object) {
        var self = this;

        self.isSun = ko.observable(!!object.isSun);

        self.dead = ko.observable(object.dead);

        self.radius = ko.observable(self.isSun() ? 5000 : object.radius);
        self.name = ko.observable(object.name);
        self.image = ko.observable('coui://ui/main/shared/img/' + object.biome + '.png');
        self.metalSpots = ko.observable(object.metal_spots);

        self.screenX = ko.observable(-1.0); /* from celestial postion updates */
        self.screenY = ko.observable(-1.0);
        self.isHover = ko.observable(false);

        self.thrust_control = ko.observable(object.thrust_control);

        self.status = ko.observable((self.thrust_control()) ? "READY" : "");
        self.active = ko.observable(object.target);
        if (self.active())
            self.status(self.thrust_control() ? "ENGAGED" : "ACTIVITY")

        self.index = ko.observable(object.index);

        self.delta_v_threshold = ko.observable(object.required_thrust_power);
        self.delta_v_current = ko.observable(object.army_thrust_power);

        if (self.delta_v_current() > self.delta_v_threshold())
            self.delta_v_current(self.delta_v_threshold());

        self.factorOne = ko.observable(true);
        self.factorFive = ko.observable();

        self.stage_current = ko.observable();
        self.stage_total = ko.observable();

        self.isSelected = ko.computed(function () { return self.index() === model.selectedCelestialIndex() });

        self.delta_v_current_array = ko.computed(function () {
            var array = [];
            var l = self.delta_v_current();

            l = Math.floor(l);

            try { array.length = l } catch (e) {  }
            return array;
        });

        self.delta_v_theshold_array = ko.computed(function () {
            var array = [];
            var l = self.delta_v_threshold() - self.delta_v_current();

            self.factorOne(true);
            self.factorFive(false);
               
            l = Math.ceil(l);

            try { array.length = l } catch (e) { }
            return array;
        });
      
        self.isValidTarget = ko.computed(function () {
            return _.contains(model.celestialControlModel.validTargetPlanetIndexList(), self.index());
        });

        self.handleClick = function () {
            if (model.celestialControlModel.notActive()) {
                api.camera.focusPlanet(self.index());
                model.selectedCelestialIndex(self.index());
            }
        }

        self.planetZoom = function () {
            api.camera.setZoom("orbital");
        }
    }
    
    function SelectionViewModel(map) {
        var self = this;
        var key;
        var i;

        self.types = ko.observableArray([]);
        self.counts = ko.observableArray([]);

        for (key in map) {
            self.types().push(key);
            self.counts().push(map[key].length);
        }

        self.iconForSpec = function (id) {
            return 'img/build_bar/units/' + id.substring(id.search(start), id.search(end)) + '.png';
            //return 'coui://ui/main/atlas/icon_atlas/img/strategic_icons/icon_si_' + id.substring(id.search(start), id.search(end)) + '.png';
        };

        self.list = ko.computed(function () {
            var output = [];
            var i;
  
            for (i = 0; i < self.types().length; i++) {
                output.push({
                    type: self.types()[i],
                    count: self.counts()[i],
                    icon: self.iconForSpec(self.types()[i])
                });
            }

            return output;
        });
    }

    function CelestialControlModel() {
        var self = this;

        self.actionsList = ['do_nothing', 'change_orbit', 'smash_planet'];
        self.actionIndex = ko.observable(0);
        self.actionIsChangeOrbit = ko.computed(function () { return self.actionIndex() === 1; });
      
        self.validTargetPlanetIndexList = ko.observableArray([]).extend({ withPrevious: true });
        self.validTargetPlanetIndexList.subscribe(function (value) {
            _.forEach(self.validTargetPlanetIndexList.previous(), function (element) {
                api.ar_system.changePlanetSelectionState(element, 'none');
            });

            _.forEach(value, function (element) {
                //api.ar_system.changePlanetSelectionState(element, 'potential_target'); /* disable this for now, since it only shows up for the sun. */
            });
        });
        self.generateValidTargetPlanetList = function (index) {
            var list = [];
            var source = model.celestialViewModels()[index];

            if (source)
                _.forEach(model.celestialViewModels(), function (element) {
                    var ok = true;

                    if (element.dead() || element.radius() < source.radius() || element.index() == index || element.active())
                        ok = false;
                    if (element.isSun())
                        ok = self.actionIsChangeOrbit();

                    if (ok)
                        list.push(element.index());
                });

            self.validTargetPlanetIndexList(list);
        }
          
        self.sourcePlanetIndex = ko.observable(-1).extend({ withPrevious: true });
        self.sourcePlanetIndex.subscribe(function (value) {
            if (value === -1) {
                //model.mode('default');
                api.camera.setAllowZoom(true);
                api.camera.setAllowPan(true);
                api.camera.setAllowTilt(true);

                self.targetPlanetIndex(-1);
                self.selectedPlanetIndex(-1);
                self.mousedownTargetPlanetIndex(-1)
                self.hoverTargetPlanetIndex(-1);
                self.validTargetPlanetIndexList([]);

                self.hasSurfaceTarget(false)
                self.requireConfirmation(false);

                _.forEach(model.celestialViewModels(), function (element) {
                    api.ar_system.changePlanetSelectionState(element.index(), 'none');
                });
            }
            else {
                //model.mode('celestial_control');
                api.camera.setAllowZoom(false);
                api.camera.setAllowPan(false);
                api.camera.setAllowTilt(false);
                self.generateValidTargetPlanetList(value);
                api.ar_system.changePlanetSelectionState(self.sourcePlanetIndex.previous(), 'none');
                api.ar_system.changePlanetSelectionState(value, 'source');
            }        
        });

        self.actionIndex.subscribe(function () {
            self.generateValidTargetPlanetList(self.sourcePlanetIndex());
        });

        self.hasSource = ko.computed(function () { return self.sourcePlanetIndex() !== -1 });

        self.hasSurfaceTarget = ko.observable(false);
        self.requireConfirmation = ko.observable(false);
        self.requireSurfaceTarget = ko.computed(function () { return self.actionIndex() == 2; });

        self.hasSurfaceTarget.subscribe(function (value) {
            if (value)
                self.requireConfirmation(true);
        });

        self.targetPlanetIndex = ko.observable(-1).extend({ withPrevious: true });
        self.targetPlanetIndex.subscribe(function (value) {
            self.validTargetPlanetIndexList([]);
            api.ar_system.changePlanetSelectionState(self.targetPlanetIndex.previous(), 'none');
            api.ar_system.changePlanetSelectionState(value, 'target');

            if (value !== -1) {
                if (self.requireSurfaceTarget()) {

                    api.camera.focusPlanet(value);
                    api.camera.setZoom('orbital');
                    api.camera.setAllowZoom(false);
                    api.camera.setAllowPan(true);
                    api.camera.setAllowTilt(true);

                    api.ar_system.changeSkyboxOverlayColor(1.0, 0.0, 0.0, 0.2);
                    engine.call("holodeck.startRequestInterplanetaryTarget", self.sourcePlanetIndex());
                }
                else {
                    self.executeCelestialAction();
                }
            }
            else {
                api.ar_system.changeSkyboxOverlayColor(0.0, 0.0, 0.0, 0.0);
                engine.call("holodeck.endRequestInterplanetaryTarget");
            }
        });

        self.mousedownTargetPlanetIndex = ko.observable(-1).extend({ withPrevious: true });
        self.hoverTargetPlanetIndex = ko.observable(-1);

        self.mousedownTargetPlanetIndex.subscribe(function (value) {
            if (value === self.hoverTargetPlanetIndex())
                api.ar_system.changePlanetSelectionState(value, 'target');
            
            if (_.contains(self.validTargetPlanetIndexList(), self.mousedownTargetPlanetIndex.previous()))
                api.ar_system.changePlanetSelectionState(self.mousedownTargetPlanetIndex.previous(), 'potential_target');
        });
       
        self.hoverTargetPlanetIndex.subscribe(function (value) {
            if (value === self.mousedownTargetPlanetIndex()) {
                api.ar_system.changePlanetSelectionState(value, 'target');
            }
            else if (_.contains(self.validTargetPlanetIndexList(), self.mousedownTargetPlanetIndex())) {
                api.ar_system.changePlanetSelectionState(self.mousedownTargetPlanetIndex(), 'potential_target');
            }
        });

        self.interplanetaryTargetSelected = ko.observable(false);

        self.selectedPlanetIndex = ko.observable(-1).extend({ withPrevious: true });
        self.selectedPlanetIndex.subscribe(function (value) {
            api.ar_system.changePlanetSelectionState( self.selectedPlanetIndex.previous(), 'none');
            api.ar_system.changePlanetSelectionState( value, 'selected');
        });
     
        self.needsReset = ko.observable(true);
        self.reset = function () {
            self.needsReset(false);

            self.sourcePlanetIndex(-1);
            self.targetPlanetIndex(-1);
            self.selectedPlanetIndex(-1);
            self.validTargetPlanetIndexList([]);

            self.hasSurfaceTarget(false);
            self.requireConfirmation(false);

            api.camera.setAllowZoom(true);
            api.camera.setAllowPan(true);
            api.camera.setAllowTilt(true);

            api.ar_system.changeSkyboxOverlayColor(0.0, 0.0, 0.0, 0.0);

            _.forEach(model.celestialViewModels(), function (element) {
                api.ar_system.changePlanetSelectionState(element.index(), 'none');
            });
        };

        self.notActive = ko.computed(function () { return self.sourcePlanetIndex() === -1; });
        self.active = ko.computed(function () { return !self.notActive(); });
        self.findingTargetSurfacePosition = ko.computed(function () { return self.targetPlanetIndex() !== -1; });
        self.findingTargetPlanet = ko.computed(function () { return self.sourcePlanetIndex() !== -1 && !self.findingTargetSurfacePosition(); });

        self.smashPlanet = function (index) {
            self.actionIndex(2);
            self.sourcePlanetIndex(index);
            api.camera.setZoom('celestial');
        };

        self.movePlanet = function (index) {
            self.actionIndex(1);
            self.sourcePlanetIndex(index);
            api.camera.setZoom('celestial');
        };

        self.setTargetPlanet = function (index) {
            if(_.contains(self.validTargetPlanetIndexList(), index))
                self.targetPlanetIndex(index);
        }

        self.setMousedownTargetPlanetIndex = function (index) {
            if (_.contains(self.validTargetPlanetIndexList(), index) || index === -1)
                self.mousedownTargetPlanetIndex(index);
        }

        self.executeCelestialAction = function () {
            switch (self.actionIndex()) {
                case 0: /* do nothing */ break;
                case 1:
                    console.log('move planet!!!');
                    engine.call('planet.movePlanet', self.sourcePlanetIndex(), self.targetPlanetIndex(), 10000.0);
                    break;
                case 2:
                    console.log('attack planet!!!');
                    engine.call("holodeck.endRequestInterplanetaryTarget");
                    engine.call('planet.attackPlanet', self.sourcePlanetIndex(), Number(0), Number(0), Number(0));
                    api.audio.playSound('/SE/UI/UI_Annihilate');
                    break;
            }

            self.reset();
        }

        self.mousedown = function (mdevent) {            
            _.forEach(model.celestialViewModels(), function (element) {
                //console.log(element.index() + ' ' + element.isSun() + ' ' + element.isHover());
                if (element.isHover()) {
                    //console.log('isHover' + element.index());
                    self.setMousedownTargetPlanetIndex(element.index());
                    return false; /* ends forEach */
                }
            });
        }

        self.mouseup = function (mdevent) {
            if (self.mousedownTargetPlanetIndex() === self.hoverTargetPlanetIndex())
                self.setTargetPlanet(self.mousedownTargetPlanetIndex());

            self.hoverTargetPlanetIndex(-1);
            self.setMousedownTargetPlanetIndex(-1);
        }
    }

    function LiveGameViewModel() {
        var self = this;

        var calcRegion = function ($div, $doc) {
            $doc = $doc || $(document);

            var divOffset = $div.offset();
            var docWidth = $doc.width();
            var docHeight = $doc.height();

            return {
                left: divOffset.left,
                top: divOffset.top,
                width: $div.width(),
                height: $div.height()
            };   
        };

        var prev_regions_string = '{}';

        //self.buildKeysViewModel = new BuildKeysViewModel();

        self.doExitGame = ko.observable(false);
        self.showPopUP = ko.observable(false);
        self.popUpPrimaryMsg = ko.observable(loc('!LOC(live_game:exit_game.message):Exit Game?'));
        self.popUpSecondaryMsg = ko.observable('');

        self.popUpPrimaryButtonAction = function () { 
            if (self.doExitGame())
                model.exit();
            else
                model.navToMainMenu();
        };
        self.popUpSecondaryButtonAction = function () { self.showPopUP(false) };
        self.popUpTertiaryButtonAction = function () { self.showPopUP(false) };
        self.popUpPrimaryButtonTag = ko.observable(loc('!LOC(live_game:yes.message):Yes'));
        self.popUpSecondaryButtonTag = ko.observable(loc('!LOC(live_game:cancel.message):Cancel'));
        self.popUpTertiaryButtonTag = ko.observable(false);
        
        self.mode = ko.observable('default');

        self.lastSceneUrl = ko.observable().extend({ session: 'last_scene_url' });

        self.buildVersion = ko.observable().extend({ session: 'build_version' });

        self.uberId = ko.observable().extend({ session: 'uberId' });
        self.haveUberNet = ko.computed(function () {
            return self.uberId() != '';
        });

        self.reviewMode = ko.observable(false).extend({ session: 'review_mode' });
        self.gameOverReviewMode = ko.observable(false).extend({ session: 'game_over_review_mode' });

        self.devMode = ko.observable().extend({ session: 'dev_mode' });

        self.transitPrimaryMessage = ko.observable().extend({ session: 'transit_primary_message' });
        self.transitSecondaryMessage = ko.observable().extend({ session: 'transit_secondary_message' });
        self.transitDestination = ko.observable().extend({ session: 'transit_destination' });
        self.transitDelay = ko.observable().extend({ session: 'transit_delay' });
        self.userTriggeredDisconnect = ko.observable(false);
  
        self.celestialControlModel = new CelestialControlModel();
        self.celestialControlActive = ko.computed(function () { return !self.celestialControlModel.notActive() });
  
        self.systemName = ko.observable('System');
        self.celestialViewModels = ko.observableArray([]);
        self.startingPlanetBiome = ko.observable('earth');
        self.selectedCelestialIndex = ko.observable(-1);
        self.selectSun = function () {
            self.selectedCelestialIndex(self.celestialViewModels.length);
            api.camera.setZoom('celestial');
        }
        self.isSunSelected = ko.computed(function () {
            return self.selectedCelestialIndex() === -1 || self.selectedCelestialIndex() === self.celestialViewModels().length;
        });
        self.planetActionSourceCelestialIndex = ko.observable(-1);
        self.hoverCelestialIndex = ko.observable(-1);

        self.pinCelestialViewModels = ko.observable(false);
        self.togglePinCelestialViewModels = function () {
            self.pinCelestialViewModels(!self.pinCelestialViewModels());
        };

        self.showCelestialViewModels = ko.computed(function () {
            return self.pinCelestialViewModels() || self.celestialControlActive();
        });

        self.collapseCelestialViewModels = ko.observable(true);
        self.showPlanetDetailPanel = ko.computed(function () {
            return false;
        });
        self.selectedPlanetThumb = ko.computed(function() {
            var planetIndex = self.selectedCelestialIndex();
            var selectedPlanet = planetIndex >= 0 ? self.celestialViewModels()[planetIndex] : undefined;
            if (!selectedPlanet || selectedPlanet.isSun())
                return "coui://ui/main/shared/img/img_system_generic_icon.png";
            else
                return selectedPlanet.image();
        });
        self.selectedPlanetName = ko.computed(function() {
            var planetIndex = self.selectedCelestialIndex();
            var selectedPlanet = planetIndex >= 0 ? self.celestialViewModels()[planetIndex] : undefined;
            if (!selectedPlanet || selectedPlanet.isSun())
                return self.systemName();
            else
                return selectedPlanet.name();
        });

        self.startChangeOrbit = function () {
            self.planetActionSourceCelestialIndex(self.selectedCelestialIndex());
            self.inPlanetMoveSequence(true);
            self.confirming(false);
            self.message(loc('!LOC(live_game:select_a_target_location.message):Select a target location'));
            engine.call("holodeck.startRequestInterplanetaryTarget", self.planetActionSourceCelestialIndex());
        }
        self.startAnnihilate = function () {
            self.planetActionSourceCelestialIndex(self.selectedCelestialIndex());
            self.inPlanetAnnihilateSequence(true);
            self.confirming(false);
            self.message(loc('!LOC(live_game:select_a_target_location.message):Select a target location'));
            engine.call("holodeck.startRequestInterplanetaryTarget", self.planetActionSourceCelestialIndex());
        }
        self.confirmPlanetAction = function () {

            if (self.inPlanetAnnihilateSequence()) {
                self.inPlanetAnnihilateSequence(false);
                engine.call("holodeck.endRequestInterplanetaryTarget");
                engine.call('planet.attackPlanet', self.planetActionSourceCelestialIndex(), Number(0), Number(0), Number(0));
                api.audio.playSound('/SE/UI/UI_Annihilate');
            }
            else if (self.inPlanetMoveSequence()) {
                self.inPlanetMoveSequence(false);
                engine.call("holodeck.endRequestInterplanetaryTarget");
                //engine.call('planet.movePlanet', self.planetActionSourceCelestialIndex(), 0, 1000.0);
            }
        }
        self.cancelPlanetAction = function () {
            self.inPlanetAnnihilateSequence(false);
            self.inPlanetMoveSequence(true);
            self.confirming(false);
            self.planetSmashSourceCelestialIndex(-1);
            engine.call("holodeck.endRequestInterplanetaryTarget");
        }

        self.chatLog = ko.observableArray();
        self.visibleChat = ko.observableArray();
        self.chatSelected = ko.observable(false);
        self.teamChat = ko.observable(false);
        self.twitchChat = ko.observable(false);

        self.players = ko.observableArray();
        self.spectatorArmyData = ko.observableArray();
        
        self.mergeInSpectatorData = function() {
            var playersTemp = model.players().slice(0);
            
            for (i = 0; i < self.spectatorArmyData().length; i++) {
                spectatorData = self.spectatorArmyData()[i];
                
                var playerData = _.find(playersTemp, function (data) {
                        return data.name === spectatorData.name;
                });
                
                if (playerData)
                {
                    // copy production
                    var metalInc = spectatorData.metal.production;
                    var energyInc = spectatorData.energy.production;
                    
                    var metalWaste = 0;
                    if (metalInc > spectatorData.metal.demand && spectatorData.metal.current === spectatorData.metal.storage) {
                        metalWaste = metalInc - spectatorData.metal.demand;
                    } else if (metalInc < spectatorData.metal.demand && spectatorData.metal.current === 0) {
                        metalWaste = metalInc - spectatorData.metal.demand;
                    }
                    
                    var energyWaste = 0;
                    if (energyInc > spectatorData.energy.demand && spectatorData.energy.current === spectatorData.energy.storage) {
                        energyWaste = energyInc - spectatorData.energy.demand;
                    } else if (energyInc < spectatorData.energy.demand && spectatorData.energy.current === 0) {
                        energyWaste = energyInc - spectatorData.energy.demand;
                    }
                    
                    playerData.metalProductionStr = '' + metalInc + ' / ' + metalWaste;
                    playerData.energyProductionStr = '' + Number(energyInc / 1000).toFixed(2) + 'K / ' + Number(energyWaste / 1000).toFixed(2) + 'K';

                    // copy army size
                    playerData.armySize = spectatorData.army_size;

                    // copy army metal value
                    playerData.armyMetal = Number(spectatorData.total_army_metal / 1000).toFixed(2);
                    playerData.mobileCount = spectatorData.mobile_army_count;
                    playerData.fabberCount = spectatorData.fabber_army_count;
                    playerData.factoryCount = spectatorData.factory_army_count;

                    // calculate efficiency
                    var metalEfficiency;
                    if (spectatorData.metal.demand > 0 && spectatorData.metal.current === 0) {
                        metalEfficiency = Math.min(1, Math.max(metalInc / spectatorData.metal.demand, 0));
                    } else {
                        metalEfficiency = 1;
                    }
                    
                    var energyEfficiency;
                    if (spectatorData.energy.demand > 0 && spectatorData.energy.current === 0) {
                        energyEfficiency = Math.min(1, Math.max(energyInc / spectatorData.energy.demand, 0));
                    } else {
                        energyEfficiency = 1;
                    }

                    playerData.buildEfficiencyStr = '' + Number(100 * metalEfficiency * energyEfficiency).toFixed(0) + '%';
                }
            }
            
            model.players([]);
            model.players(playersTemp);
        };
        
        self.energyTextColorCSS = function (index) {
            if (index >= self.spectatorArmyData().length)
                return 'color_positive';
                
            var spectatorData = self.spectatorArmyData()[index];
            var energyEfficiency;
            if (spectatorData.energy.demand > 0 && spectatorData.energy.current === 0) {
                energyEfficiency = Math.min(1, Math.max(spectatorData.energy.production / spectatorData.energy.demand, 0));
            } else {
                energyEfficiency = 1;
            }
            
            var energyFraction = spectatorData.energy.current / spectatorData.energy.storage;
            
            if (energyEfficiency === 1 && energyFraction === 1) {
                return 'color_waste';
            } else if (energyEfficiency < 1 && energyFraction === 0) {
                return 'color_negative';
            } else {
                return 'color_positive';
            }
        };
        
        self.metalTextColorCSS = function (index) {
            if (index >= self.spectatorArmyData().length)
                return 'color_positive';
                
            var spectatorData = self.spectatorArmyData()[index];
            var metalEfficiency;
            if (spectatorData.metal.demand > 0 && spectatorData.metal.current === 0) {
                metalEfficiency = Math.min(1, Math.max(spectatorData.metal.production / spectatorData.metal.demand, 0));
            } else {
                metalEfficiency = 1;
            }
            
            var metalFraction = spectatorData.metal.current / spectatorData.metal.storage;
            
            if (metalEfficiency === 1 && metalFraction === 1) {
                return 'color_waste';
            } else if (metalEfficiency < 1 && metalFraction === 0) {
                return 'color_negative';
            } else {
                return 'color_positive';
            }
        };
        
        self.efficiencyTextColorCSS = function (index) {
            if (index >= self.spectatorArmyData().length)
                return 'color_positive';
                
            var spectatorData = self.spectatorArmyData()[index];
            
            var metalEfficiency;
            if (spectatorData.metal.demand > 0 && spectatorData.metal.current === 0) {
                metalEfficiency = Math.min(1, Math.max(spectatorData.metal.production / spectatorData.metal.demand, 0));
            } else {
                metalEfficiency = 1;
            }
            
            var energyEfficiency;
            if (spectatorData.energy.demand > 0 && spectatorData.energy.current === 0) {
                energyEfficiency = Math.min(1, Math.max(spectatorData.energy.production / spectatorData.energy.demand, 0));
            } else {
                energyEfficiency = 1;
            }
            
            var efficiency = metalEfficiency * energyEfficiency;
            
            if (efficiency === 1) {
                return 'color_positive';
            } else if (efficiency >= 0.8) {
                return 'color_warning';
            } else {
                return 'color_negative';
            }
        };

        self.defeated = ko.observable(false);

        self.showPlayerViewModels = ko.computed(function () {
            return self.players() && self.players().length;
        });

        // Player List Panel pinning
        self.pinPlayerListPanel = ko.observable(false);
        self.togglePinPlayerListPanel = function () { self.pinPlayerListPanel(!self.pinPlayerListPanel()); };
        self.showPlayerListPanel = ko.computed(function () { return self.pinPlayerListPanel() });

        // Spectator Panel pinning
        self.pinSpectatorPanel = ko.observable(true);
        self.togglePinSpectatorPanel = function () { self.pinSpectatorPanel(!self.pinSpectatorPanel()); };
        self.showSpectatorPanel = ko.computed(function () { return self.pinSpectatorPanel() && self.showPlayerViewModels() });
        self.visionSelectAll = function () {
            var i;
            var flags = [];

            for (i = 0; i < self.players().length; i++)
                flags.push(1);

            self.playerVisionFlags([]);
            self.playerVisionFlags(flags);

            self.send_message('change_vision_flags', { 'vision_flags': self.playerVisionFlags() });
            engine.call('game.updateObservableArmySet', flags);
        };
        self.visionSelect = function (index, event) {
            var flags = [];
            var i;

            for (i = 0; i < self.players().length; i++){
                // If the shift key is held down add the player to the list of visible armies.
                if (event.shiftKey) {
                    var idx = self.playerVisionFlags()[i] ? 1 : 0;
                    var idxFlipped = self.playerVisionFlags()[i] ? 0 : 1;
                    flags.push(i === index ? idxFlipped : idx);
                } else {
                    flags.push(i === index ? 1 : 0);
                }
            }

            self.playerVisionFlags([]);
            self.playerVisionFlags(flags);

            self.send_message('change_vision_flags', { 'vision_flags': self.playerVisionFlags() });
            engine.call('game.updateObservableArmySet', flags);
        };
        
        self.spectatorPanelMode = ko.observable(0);
        self.setSpectatorPanelMode = function(index) {
            self.spectatorPanelMode(index);
        };

        self.playerVisionFlags = ko.observableArray([]);
        self.updatePlayerVisionFlag = function (index) {
            var list = self.playerVisionFlags();
            var flags = [];
            var i;

            for (i = 0; i < list.length; i++)
                flags.push(list[i] ? 1 : 0);

            self.send_message('change_vision_flags', { 'vision_flags': self.playerVisionFlags() });
            engine.call('game.updateObservableArmySet', flags);
        };
        self.showPlayerVisionFlags = ko.computed(function () {
            return self.devMode() || self.reviewMode();
        });

        self.playerControlFlags = ko.observableArray([]);
        self.updatePlayerControlFlag = function (index) {
            var list = self.playerControlFlags();
            var flags = [];
            var i;
            
            for (i = 0; i < list.length; i++) {
                self.playerControlFlags()[i] = (i === index) ? true : false;
                flags.push(list[i] ? 1 : 0);
            }

            self.playerVisionFlags()[index] = true;
            self.playerVisionFlags.notifySubscribers();
            self.playerControlFlags.notifySubscribers();

            self.send_message('change_control_flags', { 'control_flags': self.playerControlFlags() });
            self.send_message('change_vision_flags', { 'vision_flags': self.playerVisionFlags() });

            engine.call('game.updateControlableArmySet', flags);
            engine.call('game.updateObservableArmySet', flags);

            // dirty hack to get the visibility to actually update
            setTimeout(function () { self.updatePlayerVisionFlag(index); }, 10);
        };
        self.showPlayerControlFlags = ko.computed(function () {
            return self.devMode();
        });

        self.initPlayerVision = function () {
            var list = self.playerVisionFlags();
            var flags = [];
            var i;

            for (i = 0; i < list.length; i++)
                flags.push(list[i] ? 1 : 0);

            engine.call('game.updateObservableArmySet', flags);
        }

        self.controlSingleArmy = function () {
            var i;
            var v_flags = [];
            var c_flags = [];
            var armies = self.players();
            var isPlayerArmy;

            for (i = 0; i < self.armyCount(); i++) {
                isPlayerArmy = (self.armyId() === armies[i].id);
                self.playerVisionFlags()[i] = isPlayerArmy;
                self.playerControlFlags()[i] = isPlayerArmy;

                v_flags.push(isPlayerArmy ? 1 : 0);
                c_flags.push(isPlayerArmy ? 1 : 0);
            }

            self.playerVisionFlags.notifySubscribers();
            self.playerControlFlags.notifySubscribers();

            self.send_message('change_control_flags', { 'control_flags': self.playerControlFlags() });
            self.send_message('change_vision_flags', { 'vision_flags': self.playerVisionFlags() });

            engine.call('game.updateControlableArmySet', c_flags);
            engine.call('game.updateObservableArmySet', v_flags);
        }

        self.startObserverMode = function () {

            var i;
            var v_flags = [];
            var c_flags = [];

            for (i = 0; i < self.armyCount() ; i++) {
                self.playerVisionFlags()[i] = true;
                self.playerControlFlags()[i] = false;

                v_flags.push(1);
                c_flags.push(0);
            }

            self.playerVisionFlags.notifySubscribers();
            self.playerControlFlags.notifySubscribers();

            self.send_message('change_control_flags', { 'control_flags': self.playerControlFlags() });
            self.send_message('change_vision_flags', { 'vision_flags': self.playerVisionFlags() });

            engine.call('game.updateControlableArmySet', c_flags);
            engine.call('game.updateObservableArmySet', v_flags);
            
            engine.call('execute', 'observer', '{}');

            self.reviewMode(true);
        }

        self.showTimeControls = ko.observable(false).extend({ session: 'show_time_controls' });

        self.optionsBarIsOpen = ko.observable(false);

        self.showOptionsBar = ko.computed(function () { return self.optionsBarIsOpen() && !self.showTimeControls() });
        self.showSelectionBar = ko.computed(function () {
            return !self.showOptionsBar()
                    && !self.reviewMode()
                    && self.celestialControlModel.notActive();
        });
        self.showGameStats = ko.observable(false);
       
        self.timeSpeed = ko.observable(1.0);
        self.paused = ko.observable(false);
        
        
        self.controlTime = function() {
            if (!model.showTimeControls())
            {
                model.showTimeControls(true);
                api.time.control();
            }
        };
        self.showTimeControls.subscribe(function (value) {
            if (value)
                api.time.control();
            else
                api.time.resume();
        });

        self.skipBack = function () { 
            self.controlTime();
            api.time.skip(-10.0); 
        };
        self.seekBack = function () { 
            self.controlTime();
            self.paused(false);
            var ts = self.timeSpeed();
            ts = ((ts < 0.0) ? ts * 2.0 : -1.0);
            self.timeSpeed(ts);
            api.time.play(ts);
        };
        self.playBack = function () { 
            self.controlTime();
            self.paused(false);
            self.timeSpeed(-1.0);  
            api.time.play(-1.0); 
        };
        self.pause = function () { 
            self.controlTime();
            self.paused(true); 
            api.time.pause(); 
        };
        self.resume = function () { 
            self.controlTime();
            self.paused(false); 
            api.time.resume(); 
        };
        self.playForward = function () { 
            self.controlTime();
            self.paused(false);
            self.timeSpeed(1.0);  
            api.time.play(1.0); 
        };
        self.seekForward = function () {
            self.controlTime();
            self.paused(false);
            var ts = self.timeSpeed();
            ts = ((ts > 0.0) ? ts * 2.0 : 1.0);
            self.timeSpeed(ts);
            api.time.play(ts);
        };

        self.inTimeScrub = ko.observable(false);

        self.timeScrubStartX = ko.observable(0.0);
        self.timeScrubCurrentX = ko.observable(0.0);
        self.timeScrubBaseTime = ko.observable(0.0)

        self.useTimeScrubHoldValue = ko.observable(false);
        self.timeScrubHoldValue = ko.observable(0);

        self.currentTimeInSeconds = ko.observable(0.0);
        self.endOfTimeInSeconds = ko.observable(0.0);
        self.timeFraction = ko.computed(function () {
            return (self.endOfTimeInSeconds()) ? self.currentTimeInSeconds() / self.endOfTimeInSeconds() : 0.0;
        });
        self.timePercentString = ko.computed(function () {
            return '' + (100 * self.timeFraction()) + '%';
        });

        self.timeScrubValue = ko.computed(function () {
            return (384 * self.timeFraction());
        });

        self.timeScrubTargetTime = ko.computed(function () {
            return (self.timeScrubValue() / 384.0) * self.endOfTimeInSeconds();
        });

        self.timeScrubPixel = ko.computed(function () {
            return '' + self.timeScrubValue() - 11 + 'px';
        });

        self.startTimeScrub = function () {
            var event = window.event;
            self.inTimeScrub(true);
            self.timeScrubStartX(event.screenX);
            self.timeScrubBaseTime(self.currentTimeInSeconds());
            api.time.pushSpeed();
            self.pause();
        }
        self.stopTimeScrub = function () {
            self.inTimeScrub(false);
            self.playForward();
            api.time.popSpeed();
        } 

        self.chatType = ko.computed(function () {
            return (self.teamChat()) ? "TEAM:" : (self.twitchChat() ? "TWITCH:" : "ALL:");
        });

        self.sendChat = function (message) {
            var msg = {};
            msg.message = $(".input_chat_text").val();

            if (msg.message && self.teamChat()) 
                model.send_message("team_chat_message", msg);
            else if (msg.message && self.twitchChat())
                api.twitch.sendChatMessage(msg.message);
            else if (msg.message)
                model.send_message("chat_message", msg);
            
            $(".input_chat_text").val("");
            model.chatSelected(false);
        }

        self.removeOldChatMessages = function () {
            var date = new Date();
            var cutoff = date.getTime() - 15 * 1000;

            while (self.visibleChat().length > 0 && self.visibleChat()[0].timeStamp < cutoff) 
                self.visibleChat.shift();
        }

        self.updateIdleTimer = function () {
            idleTime += 1;
            if (idleTime >= 120)
                self.navToMainMenu();
        }

        self.createTimeString = function (time) {
            var s = Math.floor(time);
            var ms = Math.floor(60 * (time - s));
            var m = Math.floor(s / 60);
            s = s - m * 60;
            return ((m < 9) ? '0' : '') + m + ':' + ((s < 9) ? '0' : '') + s;
        }

        self.showLanding = ko.observable().extend({ session: 'showLanding' });
        self.inPlanetAnnihilateSequence = ko.observable(false);
        self.inPlanetMoveSequence = ko.observable(false);
        self.inPlanetActionSequence = ko.computed(function () {
            return self.inPlanetAnnihilateSequence() || self.inPlanetMoveSequence();
        });

        self.showMessage = ko.computed(function () {
            return self.showLanding()
                    || self.inPlanetAnnihilateSequence()
                    || self.inPlanetMoveSequence();
        });

        self.currentTimeString = ko.computed(function () {
            return self.createTimeString(self.currentTimeInSeconds());
        });

        self.endOfTimeString = ko.computed(function () {
            return self.createTimeString(self.endOfTimeInSeconds());
        });

        self.message = ko.observable().extend({ session: 'lg_message' });
        self.confirming = ko.observable(false).extend({ session: 'lg_confirming' });

        self.showResources = ko.computed(function () {
            return !self.showLanding() && !self.defeated() && self.celestialControlModel.notActive();
        });

        self.currentMetal = ko.observable(5.0);
        self.maxMetal = ko.observable(12.0);
        self.metalFraction = ko.computed(function () {
            return (self.maxMetal()) ? self.currentMetal() / self.maxMetal() : 0.0;
        });

        self.currentEnergy = ko.observable(1.0);
        self.maxEnergy = ko.observable(2.0);
        self.energyFraction = ko.computed(function () {
            return (self.maxEnergy()) ? self.currentEnergy() / self.maxEnergy() : 0.0;
        });

        self.commands = ko.observableArray(['move',
                                           'attack',
                                           'assist',

                                           'repair',
                                           'reclaim',
                                           'patrol',

                                           'use',
                                           'special_move',
                                           'special_attack',

                                           'unload',
                                           'load',
                                           'link_teleporters',

                                           'fire_secondary_weapon',
                                           'ping'
        ]);

        self.targetableCommands = ko.observableArray([false,
                                                      true,
                                                      true,

                                                      true,
                                                      true,
                                                      false,

                                                      true,
                                                      false,
                                                      true,

                                                      false,
                                                      true,
                                                      true,

                                                      false,
                                                      false]);

        self.toPascalCase = function (command) {
            if (!command || !command.length)
                return '';

            return command
                    .replace(/^[a-z]/, function (m) { return m.toUpperCase() })
                    .replace(/_[a-z]/g, function (m) { return m.toUpperCase() })
                    .replace(/_/g, '');
        }

        self.allowedCommands = {};
   
        self.cmdIndex = ko.observable();
        self.cmd = ko.computed(function () {
            if (self.cmdIndex() === -1)
                return 'stop';
            return self.commands()[self.cmdIndex()];
        });

        self.commanderHealth = ko.observable(1.0);
        self.armySize = ko.observable(0.0);

        self.armyCount = ko.observable();
        self.armyId = ko.observable();
        self.isSpectator = ko.computed(function () {
            return !self.armyId() || self.defeated();
        });

        self.cmdQueueCount = ko.observable(0);
        
        self.endCommandMode = function() {
            self.cmdIndex(-1);
            self.mode('default');
            api.arch.endFabMode();
            api.arch.endAreaCommandMode();
            engine.call('set_command_mode', '');
        };

        self.setCommandIndex = function (index) {
            var stop = (index === -1);
            var ping = (index === 13);

            console.log('setCommandIndex ' + index);

            if (!stop && !ping && !self.allowedCommands[self.toPascalCase(self.commands()[index])])
                return;

            self.endCommandMode()

            self.cmdIndex(index);
            self.cmdQueueCount(0);
            if (!stop)
                self.mode('command_' + self.cmd());
            else
                self.mode('default');

            engine.call("set_command_mode", self.cmd());
        };

        self.isMove = ko.computed(function () { return self.cmdIndex() == 0; });
        self.isAttack = ko.computed(function () { return self.cmdIndex() == 1; });
        self.isAssist = ko.computed(function () { return self.cmdIndex() == 2; });
        self.isRepair = ko.computed(function () { return self.cmdIndex() == 3; });
        self.isReclaim = ko.computed(function () { return self.cmdIndex() == 4; });
        self.isPatrol = ko.computed(function () { return self.cmdIndex() == 5; });
        self.isUse = ko.computed(function () { return self.cmdIndex() == 6; });

        self.isSpecialMove = ko.computed(function () { return self.cmdIndex() == 7; });
        self.isSpecialAttack = ko.computed(function () { return self.cmdIndex() == 8; });
        self.isUnload = ko.computed(function () { return self.cmdIndex() == 9; });
        self.isLoad = ko.computed(function () { return self.cmdIndex() == 10; });
        self.isFireSecondaryWeapon = ko.computed(function () { return self.cmdIndex() == 12; });
        self.isPing = ko.computed(function () { return self.cmdIndex() == 13; });

        self.hoverOrderIndex = ko.observable(-1);
        self.hoverCounter = 0;
        self.hoverClearing = false;
        self.setHoverIndex = function (index) { self.hoverOrderIndex(index); self.hoverCounter = 1; self.hoverClearing = false; }
        self.maybeClearHoverIndex = function (index) {
            self.hoverClearing = true;
        }

        self.selectedFireOrderIndex = ko.observable(0);
        self.fireOrders = ko.observableArray(['fire_at_will', 'return_fire', 'hold_fire']);
        self.fireOrdersMap = {
            'fire at will': 0,
            'return fire': 1,
            'hold fire': 2,
        };
        self.toggleFireOrderIndex = function () {
            var index = (self.selectedFireOrderIndex() + 1) % self.fireOrders().length;
            var order = self.fireOrders()[index];
            if (order)
                engine.call('set_order_state', 'weapon', order);
            self.selectedFireOrderIndex(index);
        }
        self.selectionFireAtWill = function () {
            self.selectedFireOrderIndex(0);
            engine.call('set_order_state', 'weapon', 'fire at will');
        }

        self.selectionReturnFire = function () {
            self.selectedFireOrderIndex(1);
            engine.call('set_order_state', 'weapon', 'return fire');
        }

        self.selectionHoldFire = function () {
            self.selectedFireOrderIndex(2);
            engine.call('set_order_state', 'weapon', 'hold fire');
        }

        self.selectedMoveOrderIndex = ko.observable(0);
        self.moveOrders = ko.observableArray(['maneuver', 'roam', 'hold_position']);
        self.moveOrdersMap = {
            'maneuver': 0,
            'roam': 1,
            'hold position': 2
        };
        self.toggleMoveOrderIndex = function () {
            var index = (self.selectedMoveOrderIndex() + 1) % self.moveOrders().length;
            var order = self.moveOrders()[index];
            if (order)
                engine.call('set_order_state', 'movement', order);
            self.selectedMoveOrderIndex(index);
        }

        self.selectionManeuver = function () {
            self.selectedMoveOrderIndex(0);
            engine.call('set_order_state', 'movement', 'manuever');
        }

        self.selectionRoam = function () {
            self.selectedMoveOrderIndex(1);
            engine.call('set_order_state', 'movement', 'roam');
        }

        self.selectionHoldPosition = function () {
            self.selectedMoveOrderIndex(2);
            engine.call('set_order_state', 'movement', 'hold position');
        }

        self.selectedEnergyOrderIndex = ko.observable(0);
        self.energyOrders = ko.observableArray(['consume', 'conserve']);
        self.energyOrdersMap = {
            'consume': 0,
            'conserve': 1
        };
        self.toggleEnergyOrderIndex = function () {
            var index = (self.selectedEnergyOrderIndex() + 1) % self.energyOrders().length;
            var order = self.energyOrders()[index];
            if (order)
                engine.call('set_order_state', 'energy', order);
            self.selectedEnergyOrderIndex(index);
        }

        self.selectionConsume = function () {
            self.selectedEnergyOrderIndex(0);
            engine.call('set_order_state', 'energy', 'consume');
        }

        self.selectionConserve = function () {
            self.selectedEnergyOrderIndex(1);
            engine.call('set_order_state', 'energy', 'conserve');
        }

        self.selectedBuildStanceOrderIndex = ko.observable(0);
        self.buildStanceOrders = ko.observableArray(['normal', 'continuous']);
        self.buildStanceOrdersMap = {
            'normal': 0,
            'continuous': 1
        };
        self.toggleBuildStanceOrderIndex = function () {
            var index = (self.selectedBuildStanceOrderIndex() + 1) % self.buildStanceOrders().length;
            var order = self.buildStanceOrders()[index];
            if (order)
                engine.call('set_order_state', 'build', order);
            self.selectedBuildStanceOrderIndex(index);
        }

        self.selectionBuildStanceNormal= function () {
            self.selectedBuildStanceOrderIndex(0);
            engine.call('set_order_state', 'build', 'normal');
        }

        self.selectionBuildStanceContinuous = function () {
            self.selectedBuildStanceOrderIndex(1);
            engine.call('set_order_state', 'build', 'continuous');
        }



        self.buildLists = {};
        self.unitList = function () {
            return Object.keys(self.buildLists);
        };

        self.buildTabs = ko.observableArray([]);
        self.buildTabLists = ko.observableArray([]);
        self.buildTabOrders = ko.observableArray([]);
    
        self.toggleBuildTab = function () {
            var index = 0;
            if (self.buildTabLists().length)
                index = (self.selectedBuildTabIndex() + 1) % self.buildTabLists().length;

            self.selectedBuildTabIndex(index);
        }

        self.buildOrders = ko.observableArray([]);
        self.buildItemMinIndex = ko.observable(0);

        self.selectedBuildTabIndex = ko.observable(0);

        self.selectedBuildTabIndex.subscribe(function (newProductId) {
            self.buildItemMinIndex(0);
        }.bind(self));

        self.windowWidth = ko.observable(window.innerWidth);
        self.windowHeight = ko.observable(window.innerHeight);
        $(window).resize(function () {
            self.windowWidth(window.innerWidth);
            self.windowHeight(window.innerHeight);
        });

        self.buildItemMaxLength = ko.computed(function () {
            // default layout is for 1280 x 720, width of a build item is 56px
            return (self.windowWidth() <= 1280) ? 16 : 16 + Math.floor((self.windowWidth() - 1280) / 56);
        });
        self.buildItemMaxIndex = ko.computed(function () { return self.buildItemMinIndex() + self.buildItemMaxLength() });

        self.rawBuildItemList = ko.computed(function () {

            var list;
            var out = [];

            if (self.selectedBuildTabIndex() >= self.buildTabLists().length)
                self.selectedBuildTabIndex(0);

            list = (self.buildTabLists().length) ? self.buildTabLists()[self.selectedBuildTabIndex()] : [];

            if (!list)
                return [];

            return list;
        });

        self.buildItems = ko.computed(function () {

            var list = self.rawBuildItemList();
            var out = [];

            for (var i = 0; i < list.length; i++) {
                out.push(new BuildItemModel(list[i], self.buildOrders()[list[i].id], false));
            }

            //for (var i = self.buildItemMinIndex(); i < list.length && i < self.buildItemMaxIndex() ; i++)
            //{
            //    out.push(new BuildItemModel(list[i], self.buildOrders()[list[i].id], false));
            //}

            return out;
        });

        self.showBuildIndexOffsetControls = ko.computed(function () {
            return (self.rawBuildItemList().length > self.buildItemMaxLength());
        });

        self.showBuildIndexOffsetLeftArrow = ko.computed(function () {
            return (self.buildItemMinIndex() > 0) && self.showBuildIndexOffsetControls();
        });

        self.showBuildIndexOffsetRightArrow = ko.computed(function () {
            return (self.rawBuildItemList().length > self.buildItemMaxIndex() && self.showBuildIndexOffsetControls());
        });

        self.shiftBuildListLeft = function () {
            self.buildItemMinIndex(self.buildItemMinIndex() - 1);
        }

        self.shiftBuildListRight = function () {
            self.buildItemMinIndex(self.buildItemMinIndex() + 1);
        }

        self.navDebug = ko.observable(false);
        self.toggleNavDebug = function() {
            self.navDebug(!self.navDebug());
            api.arch.setNavDebug(self.navDebug());
        };

        self.itemDetails = {};

        self.buildHover = ko.observable(new UnitDetailModel('', '', 0));
        self.showBuildHover = ko.computed(function () {
            if (self.showTimeControls())
                return false;
            return self.buildHover() && self.buildHover().name() ? true : false;
        });
        self.setBuildHover = function (index) {
            var id = self.buildItems()[index].id();
            self.buildHover(self.itemDetails[id]);
        };
        self.clearBuildHover = function () { self.buildHover(new UnitDetailModel('', '', 0)) }

        self.buildItemSize = ko.observable(60);

        self.worldHoverTarget = ko.observable(undefined);
        self.hasWorldHoverTarget = ko.observable(false);

        self.fabCount = ko.observable(0);
        self.batchBuildSize = ko.observable(5);

        self.currentBuildStructureId = ko.observable('');

        self.buildItem = function (item) {
            if (item.buildStructure) {

                if (self.currentBuildStructureId() === item.id && self.mode() === 'fab')
                    return;

                self.currentBuildStructureId(item.id);
                self.endCommandMode();
                api.arch.beginFabMode(item.id)
                    .then(function (ok) { if (!ok) { self.endFabMode(); } });
                self.mode('fab');
                self.fabCount(0);
            }
            else {
                api.unit.build(item.id, 1, false).then(function (success) {
                    if (success)
                        api.audio.playSound('/SE/UI/UI_Command_Build');
                });
            }
        }

        self.buildItemBySpec = function (spec_id) {
            self.buildItem(self.unitSpecs[spec_id]);
        }

        self.executeStartBuild = function (event, index) {
            var item = self.buildItems()[index];
            if (self.selectedMobile()) {
                self.endCommandMode();
                api.arch.beginFabMode(item.id()).then(function(ok) { if (!ok) { self.endFabMode(); }});
                self.mode('fab');
                self.fabCount(0);
            }
            else {
                var count = (event.shiftKey) ? self.batchBuildSize() : 1;
                if (event.button === 2)            
                    api.unit.cancelBuild(item.id(), count, event.ctrlKey);                
                else
                {
                    api.unit.build(item.id(), count, event.ctrlKey).then(function (success) {
                        if (success) {
                            var secondary = (item.count() > 0) ? '_secondary' : '';
                            api.audio.playSound('/SE/UI/UI_Command_Build' + secondary);
                        }
                    });
                }
            }
        };
        
        self.endFabMode = function() {
            self.mode('default');
            api.arch.endFabMode();
        };

        self.maybeSetBuildTarget = function (spec_id) {
            var list = (self.buildTabLists().length) ? self.buildTabLists()[0] : []; // first build tab is 'all'
            var i;

            engine.call("unit.debug.setSpecId", spec_id);

            for (i = 0; i < list.length; i++) {
                if (list[i].id === spec_id) {
                    self.buildItemBySpec(spec_id);
                    return;
                }
            }
        }

        self.maybeSetBuildTargetFromSequence = function (target_index, spec_id_list) {
            var list = (self.buildTabLists().length) ? self.buildTabLists()[0] : []; // first build tab is 'all'
            var index = -1;

            var valid = [];
  
            _.forEach(spec_id_list, function (target) {
                _.forEach(list, function (element) {
                    if (element.id === target.specId())
                        valid.push(element.id);
                });
            });

            if (valid.length)
                self.buildItemBySpec(valid[target_index % valid.length]);
        }

        self.spawnCommander = function () {
            engine.call('send_launch_message');
        };
        
        self.landingOk = function() {
            engine.call('launch_commander');
            model.confirming(false);
            self.message(loc('!LOC(live_game:waiting_for_other_players_to_land.message):Waiting for other players to land'));
        }

        self.abandon = function () {
            engine.asyncCall("ubernet.removePlayerFromGame");
        }

        self.navToGameOptions = function () {
            engine.call('pop_mouse_constraint_flag');
            engine.call("game.allowKeyboard", true);

            window.location.href = 'coui://ui/main/game/settings/settings.html';
        }

        self.navToMainMenu = function () {
            engine.call('pop_mouse_constraint_flag');
            engine.call("game.allowKeyboard", true);

            self.userTriggeredDisconnect(true);
            if( self.haveUberNet )
                self.abandon();
            self.disconnect();

            window.location.href = 'coui://ui/main/game/start/start.html';
        }

        self.navToTransit = function () {
            engine.call('pop_mouse_constraint_flag');
            engine.call("game.allowKeyboard", true);

            self.disconnect();

            window.location.href = 'coui://ui/main/game/transit/transit.html';
        }

        self.exit = function () {
            engine.call('pop_mouse_constraint_flag');
            engine.call("game.allowKeyboard", true);
            
            self.abandon();
            self.disconnect();
            self.exit();
        }

        self.toggleGameStats = function() {
            self.showGameStats(!self.showGameStats());

            if( window.gameStats == undefined ) {
                embedHtmlWithScript("game_stats.html", "#dlg", $("#div_game_stats"), function() { 
                    gameStats.show(true, model.players()); 
                });
            }
            else {
                gameStats.show(model.showGameStats(), model.players());
            }
        };
        
        // from handlers
        self.selection = ko.observable(null);
        self.hasSelection = ko.computed(function () { return !!self.selection() && self.selection().spec_ids && !$.isEmptyObject(self.selection().spec_ids) });

        self.selectionModel = ko.observable(new SelectionViewModel({}));
        self.selectionList = ko.computed(function () { return self.selectionModel().list() });
        self.selectionTypes = ko.observableArray([]);

        self.selectedAllMatchingCurrentSelectionOnScreen = function () {
            self.holodeck.selectMatchingTypes('add', self.selectionTypes());
        }

        var selectionDisplayClickState = {
            doubleTime: undefined,
            index: undefined
        };
        self.onSelectionDisplayClick = function (index, event, force_remove) {
    
            var option = getSelectOption(event);
            if (event.button === 2 || force_remove) /* right click */
                option = 'remove';
            var now = new Date().getTime();
            var double = (now <= selectionDisplayClickState.doubleTime) && (index === selectionDisplayClickState.index) && !force_remove;
            var invert = false;
            var types = self.selectionTypes();

            selectionDisplayClickState = {
                doubleTime: now + input.doubleTap.timeout,
                index: index
            };
            
            switch (option)
            {
                case 'toggle' : option = 'remove';  break;
                case 'add' : if (!double) return; break; // Already in the selection
                case '' : 
                    if (!double)
                    {
                        if (types.length === 1)
                            return;
                        invert = true;
                        option = 'remove';
                    }
                    break;
            }
            var type = types[index % types.length];
            if (type)
            {
                if (invert)
                {
                    types = types.slice(0);
                    types.splice(index % types.length, 1);
                    self.holodeck.view.selectByTypes(option, types);
                }
                else
                    self.holodeck.view.selectByTypes(option, [type]);
            }
        }

        // Twitch Status
        self.twitchStreaming = ko.observable(false);
        self.twitchAuthenticated = ko.observable(false);
        self.twitchMicEnabled = ko.observable(false);
        self.twitchSoundsEnabled = ko.observable(false);

        self.toggleStreaming = function () {
            if (self.twitchStreaming()) {
                api.twitch.disableStreaming();
            } else {
                api.twitch.enableStreaming();
            }
        };

        self.toggleMicrophone = function () {
            if (self.twitchMicEnabled()) {
                api.twitch.disableMicCapture();
            } else {
                api.twitch.enableMicCapture();
            }
        };

        self.toggleSounds = function () {
            if (self.twitchSoundsEnabled()) {
                api.twitch.disablePlaybackCapture();
            } else {
                api.twitch.enablePlaybackCapture();
            }
        };

        self.runCommercial = function () {
            api.twitch.runCommercial();
        }

        // Command Bar
        self.build_orders = {};

        self.allowMove = ko.observable(false);
        self.allowAttack = ko.observable(false);
        self.allowAssist = ko.observable(false);
        self.allowPing = ko.observable(true);
        self.allowRepair = ko.observable(false);
        self.allowReclaim = ko.observable(false);
        self.allowPatrol = ko.observable(false);
        self.allowUse = ko.observable(false);

        self.allowSpecialMove = ko.observable(false);
        self.allowUnload = ko.observable(false);
        self.allowLoad = ko.observable(false);
        self.allowFireSecondaryWeapon = ko.observable(false);
 
        self.allowStop = ko.observable(false);
        
        self.selectedMobile = ko.observable(false);

        self.allowFireOrders = ko.observable(false);
        self.allowMoveOrders = ko.observable(false);
        self.allowEnergyOrders = ko.observable(false);
        self.allowBuildStanceOrders = ko.observable(false);
   
        self.showOrders = ko.computed(function () {
            return !self.showTimeControls()
                    && self.hasSelection()
                    && !self.showLanding()
                    && !self.reviewMode()
                    && (self.allowFireOrders() || self.allowMoveOrders() || self.allowEnergyOrders() || self.allowBuildStanceOrders())
                    && self.celestialControlModel.notActive();
        });
        self.showBuildList = ko.computed(function () {
            return !self.showTimeControls()
                    && self.buildItems().length
                    && !self.showLanding()
                    && !self.reviewMode()
                    && self.celestialControlModel.notActive();
        });

        self.showCommands = ko.computed(function () {
            if (self.showTimeControls() || self.reviewMode() || self.celestialControlModel.active() || self.isSpectator())
                return false;

            if (self.allowPing()) /* this is a hack. allowPing is always true (for now).  really ping needs to be in a separate bar. */
                return true;

            if (self.hasSelection() && self.allowStop() && !self.showLanding())
                return true

            return false;
        });


        self.parseSelection = function(payload) {
            var i = 0;
            var a = [];
            var key;
            var tabs = {
                'all': {},
                'defense': {},
                'economy': {},
                'factory': {},
                'recon': {},
                'projectiles': {}
            };
            var selectionCanBuild = false;
            var selectionConsumesEnergy = false;

            self.allowedCommands = {};

            self.buildItemMinIndex(0);

            self.selection(null);
            self.cmdIndex(-1);
            self.selectionTypes([]);

            if (self.reviewMode())
                return;

            self.buildTabs([]);
            self.buildTabLists([]);
            self.buildOrders(payload.build_orders);

            function processBuildList(tab, items) {
                for (var j = 0; j < items.length; j++)        
                    tab[items[j].buildKey] = items[j];          
            }

            for (id in payload.spec_ids) {
                for (key in self.buildLists[id]) {
                    processBuildList(tabs[key], self.buildLists[id][key]);
                    selectionCanBuild = true;
                }

                for (i = 0; i < self.unitSpecs[id].commands.length; i++)
                    self.allowedCommands[self.unitSpecs[id].commands[i]] = true;
                
                if (self.unitSpecs[id].consumption.energy > 0)
                    selectionConsumesEnergy = true;

                self.selectionTypes().push(id);
            }
      
            self.allowMove(self.allowedCommands['Move']);
            self.allowAttack(self.allowedCommands['Attack']);
            self.allowAssist(self.allowedCommands['Assist']);
            self.allowPing(true);
            self.allowRepair(self.allowedCommands['Repair']);
            self.allowReclaim(self.allowedCommands['Reclaim']);
            self.allowPatrol(self.allowedCommands['Patrol']);
            self.allowUse(self.allowedCommands['Use']);
            self.allowFireSecondaryWeapon(self.allowedCommands['FireSecondaryWeapon']);

            self.allowSpecialMove(self.allowedCommands['SpecialMove']);
            self.allowUnload(self.allowedCommands['Unload'] && payload.has_transport_payload);
            self.allowLoad(self.allowedCommands['Load'] && !payload.has_transport_payload);

            self.allowStop(!jQuery.isEmptyObject(self.allowedCommands));
            
            self.selectedMobile(payload.selected_mobile);

            self.allowFireOrders(self.allowAttack() && (self.selectedMobile() || !selectionCanBuild));
            self.allowMoveOrders(self.allowMove() && self.selectedMobile() && self.allowFireOrders());
            self.allowEnergyOrders(selectionCanBuild || selectionConsumesEnergy || self.allowRepair() || self.allowReclaim());
            self.allowBuildStanceOrders(selectionCanBuild && !self.selectedMobile());

            for (key in tabs) {

                var tab_list = [];
                var sorted_keys = Object.keys(tabs[key]).sort();

                for (i = 0; i < sorted_keys.length; i++) {
                    var a = [];

                    tab_list.push(tabs[key][sorted_keys[i]]);
                }

                if (tab_list.length) {
                    self.buildTabs.push(key);
                    self.buildTabLists.push(tab_list);
                }  
            }

            if (!$.isEmptyObject(payload.spec_ids))
                self.selection(payload);

            self.selectionModel(new SelectionViewModel(payload.spec_ids));

            if (self.fireOrdersMap[payload.weapon[0]] != undefined)
                self.selectedFireOrderIndex(self.fireOrdersMap[payload.weapon[0]]);

            if (self.moveOrdersMap[payload.movement[0]] != undefined)
                self.selectedMoveOrderIndex(self.moveOrdersMap[payload.movement[0]]);

            if (self.energyOrdersMap[payload.energy[0]] != undefined)
                self.selectedEnergyOrderIndex(self.energyOrdersMap[payload.energy[0]]);

            if (self.allowBuildStanceOrders()) {
                if (self.buildStanceOrdersMap[payload.build[0]] != undefined)
                    self.selectedBuildStanceOrderIndex(self.buildStanceOrdersMap[payload.build[0]]);
            }
        };
        
        /// Camera API
        self.cameraMode = ko.observable('planet');
        self.cameraMode.subscribe(function (mode) {
            api.camera.track(false);
            api.camera.setMode(mode);
        });
        self.focusPlanet = ko.observable(0);
        self.focusPlanet.subscribe(function(index) {
            if (self.cameraMode !== 'space')
                api.camera.track(false);
            api.camera.focusPlanet(index);
        });
        self.alignCameraToPole = function() {
            api.camera.alignToPole();
        };
        self.focusSun = function () {
            api.camera.focusPlanet(-1);
        };
        self.focusNextPlanet = function () {
            var index = self.focusPlanet();
            var t = (index + 1) % self.celestialViewModels().length;

            if (index === -1)
                t = 0;

            while (t !== index) {
                if (!self.celestialViewModels()[t].dead()) {
                    self.focusPlanet(t);
                    return;
                }
                t = (t + 1) % self.celestialViewModels().length;
            }         
        }
        self.focusPreviousPlanet = function () {
            
            var index = self.focusPlanet();
            var t = (index + self.celestialViewModels().length - 1) % self.celestialViewModels().length;

            if (index === -1)
                t = self.celestialViewModels().length - 1;

            while (t !== index) {
                if (!self.celestialViewModels()[t].dead()) {
                    self.focusPlanet(t);
                    return;
                }
                t = (t + self.celestialViewModels().length - 1) % self.celestialViewModels().length;
            }
        }
        /// End Camera API

        self.unitAlertModel = new UnitAlertModel();

        self.armyAlertModel = new ArmyAlertModel();

        self.update = function () {

            if (self.hoverCounter <= 0)
                self.hoverOrderIndex(-1);
            else
                if (self.hoverClearing)
                    self.hoverCounter--;

            if (!self.showTimeControls())
                self.armyAlertModel.update(self);
        };

        self.musicHasStarted = ko.observable(false);

        self.maybePlayStartingMusic = function () {
            if (self.musicHasStarted())
                return;

            var starting_music_map = {
                earth: '/Music/Music_Planet_Load_Earth',
                lava: '/Music/Music_Planet_Load_Lava',
                moon: '/Music/Music_Planet_Load_Moon',
                ice: '/Music/Music_Planet_Load_Ice',
                tropical: '/Music/Music_Planet_Load_Tropical',
                gas: '/Music/Music_Planet_Load_Gas',
                water: '/Music/Music_Planet_Load_water',
                metal: '/Music/Music_Planet_Load_Metal'
            }

            var starting_music = starting_music_map[model.startingPlanetBiome()];
            if (!starting_music)
                starting_music = starting_music_map.earth;

            engine.call('audio.setMusic', starting_music);

            self.musicHasStarted(true)
        }

        self.applyUIDisplaySettings = function () {

            var settings = decode(localStorage.settings);

            if (settings)
                engine.call('game.updateDisplaySettings', JSON.stringify({
                    'cinematic': settings.cinematic_value === 'ON',
                    'always_show_sicons': settings.show_sicons_value === 'ALWAYS',
                    'never_show_sicons': settings.show_sicons_value === 'NEVER',
                    'show_metal_icons': settings.show_metal_icons_value === 'ON',
                    'always_show_stat_bars': settings.show_stat_bars_value === 'ALWAYS',
                    'never_show_stat_bars': settings.show_stat_bars_value === 'NEVER',
                    'always_show_focus_paths': settings.show_focus_path_value === 'ALWAYS',
                    'never_show_focus_paths': settings.show_focus_path_value === 'NEVER',
                    'show_focus_paths_if_selected': settings.show_focus_paths_if_selected_value === 'SELECTED',
                    'always_show_build_previews': settings.show_build_previews_value === 'ALWAYS',
                    'never_show_build_previews': settings.show_build_previews_value === 'NEVER',
                    'show_selection_boxes': settings.selection_boxes_value === 'ON',
                    'show_selection_icons': settings.selection_icons_value === 'ON',
                    'always_show_orbital_shell': settings.show_orbital_shell === 'RANGE DEPENDENT',
                    'never_show_orbital_shell': settings.show_orbital_shell === 'NEVER',
                    'always_show_terrestrial_units': settings.always_show_terrestrial_units === 'ALWAYS'
                }));
        }

        self.setup = function () {

            engine.call('push_mouse_constraint_flag', true);
            engine.call('request_spec_data');
            engine.call('request_model_refresh');
            engine.call('set_ui_music_state', 'in_game');

            self.showGameLoading(true);
            self.holodeck.view.arePlanetsReady().then(function(ready) {
                if (!ready) {
                    self.holodeck.view.whenPlanetsReady().done(function() {
                        self.initPlayerVision();
                        // Note: delayed a bit to avoid a black screen in some situations
                        setTimeout(function() { self.showGameLoading(false); }, 10);
                    });
                }
                else {
                    self.initPlayerVision();
                    self.showGameLoading(false);
                }
            });
        };

        self.chatSelected.subscribe(function (newValue) { 
            if (model.chatSelected())
                api.game.captureKeyboard();
            else
                api.game.releaseKeyboard();
        });

        self.startOrSendChat = function () {

            if (model.chatSelected())
                $(".chat_input_form").submit();

            model.chatSelected(!model.chatSelected());
            engine.call("game.allowKeyboard", !model.chatSelected());

            if (model.chatSelected())
                $(".div_chat_log_feed").scrollTop($(".div_chat_log_feed")[0].scrollHeight);
       
            model.mode('default');
        }

        self.startTeamChat = function () {
            self.startOrSendChat();
            model.teamChat(true);
            model.twitchChat(false);
        }

        self.startNormalChat = function () {
            self.startOrSendChat();
            model.teamChat(false);
            model.twitchChat(false);
        }
       
        self.startTwitchChat = function () {
            self.startOrSendChat();
            model.teamChat(false);
            model.twitchChat(true);
        }
        
        var $holodeck = $('holodeck');
        self.pips = [];
        $holodeck.each(function() {
            var $this = $(this);
            var primary = $this.is('.primary');
            var holodeck = new api.Holodeck($this, {}, primary ? function(hdeck) { hdeck.focus(); } : undefined);
            if (primary) {
                self.holodeck = holodeck;
            }
            else if ($this.is('.pip')) {
                self.pips.push(holodeck);
            }
            else if ($this.is('.preview')) {
                self.preview = holodeck;
            }
            
        });
        self.showPips = ko.observable(false);
        var firstPipShow = true;
        self.showPips.subscribe(function(show) {
            // Delaying the update by 30ms updates the drop shadow at about the same time as the holodeck
            _.delay(function() { 
                _.forEach(self.pips, function(pip) { pip.update(); });
                if (firstPipShow && show) {
                    // Without this extra delay, the camera copy will go through before the initial holodeck state.
                    _.delay(function() { _.forEach(self.pips, function(pip) { pip.copyCamera(self.holodeck); }); }, 30);
                    firstPipShow = false;
                }
            }, 30);
        });
        self.togglePips = function() {
            self.showPips(!self.showPips());
        };
        self.swapPips = function() {
            if (firstPipShow)
                return;
            if (api.Holodeck.focused === self.holodeck) {
                for (var h = 0; h < self.pips.length; ++h) {
                    var swap = (h + 1) < self.pips.length ? self.pips[h + 1] : self.holodeck;
                    self.pips[h].swapCamera(swap);
                }
            }
            else {
                self.holodeck.swapCamera(api.Holodeck.focused);
            }
        };
        self.copyToPip = function() {
            if (!self.pips.length)
                return;
            self.pips[0].copyCamera(self.holodeck);
            if (!self.showPips())
                self.togglePips();
        };

        self.showPipControls = ko.observable(false);
        self.showGameLoading = ko.observable(true);
        self.updateGameLoading = function() {
            var loadingPanel = api.panels.building_planets;
            if (loadingPanel)
                loadingPanel.message('toggle', {show: self.showGameLoading()});
        };
        self.showGameLoading.subscribe(function() { self.updateGameLoading(); });

        var getSelectOption = function(event) {
            if (event.shiftKey)
            {
                if (event.ctrlKey)
                    return 'remove';
                else
                    return 'add';
            }
            else if (event.ctrlKey)
                return 'toggle';
            else
                return '';
        };
        
        self.playSelectionSound = function(wasSelected, prevSelection, isSelected, curSelection) {
            if (!isSelected)
            {
                if (wasSelected)
                    api.audio.playSound("/SE/UI/UI_Unit_UnSelect");
                return;
            }

            var playSelect = !wasSelected;
            var playUnselect = false;
            if (!playSelect)
            {
                for (var id in curSelection.spec_ids)
                {
                    var prev = prevSelection.spec_ids[id];
                    if (!prev)
                    {
                        playSelect = true;
                        break;
                    }
                    var cur = curSelection.spec_ids[id];
                    var selected = _.difference(cur, prev);
                    if (selected.length)
                    {
                        playSelect = true;
                        break;
                    }
                    if (!playUnselect)
                    {
                        var removed = _.difference(prev, cur);
                        if (removed.length)
                        {
                            playUnselect = true;
                        }
                    }
                }
                if (!playSelect && !playUnselect)
                {
                    for (var id in prevSelection.spec_ids)
                    {
                        if (!curSelection.spec_ids[id])
                        {
                            playUnselect = true;
                            break;
                        }
                    }
                }
            }
            if (playSelect)
                api.audio.playSound("/SE/UI/UI_Unit_Select");
            else if (playUnselect)
                api.audio.playSound("/SE/UI/UI_Unit_UnSelect");
        };
        
        var holodeckModeMouseDown = {};
        
        holodeckModeMouseDown.fab = function(holodeck, mdevent) {
            if (mdevent.button === 0)
            {
                var queue = mdevent.shiftKey;
                model.fabCount(model.fabCount() + 1);
                if (queue && (model.fabCount() === 1))
                {
                    var shiftWatch = function(keyEvent) {
                        if (!keyEvent.shiftKey)
                        {
                            $('body').off('keyup', shiftWatch);
                            if (self.mode() === 'fab')
                                self.endFabMode();
                            else if (self.mode() === 'fab_rotate')
                                self.mode('fab_end');
                        }
                    };
                    $('body').on('keyup', shiftWatch);
                }
                var beginFabX = mdevent.offsetX;
                var beginFabY = mdevent.offsetY;
                var beginSnap = !mdevent.ctrlKey;
                holodeck.unitBeginFab(beginFabX, beginFabY, beginSnap);
                self.mode('fab_rotate');
                input.capture(holodeck.div, function(event) {
                    if ((event.type === 'mouseup') && (event.button === 0))
                    {
                        var snap = !event.ctrlKey;
                        holodeck.unitEndFab(event.offsetX, event.offsetY, queue, snap).then(function(success) {
                            if (success)
                                api.audio.playSound("/SE/UI/UI_Building_place");
                        });
                        queue &= (self.mode() !== 'fab_end');
                        self.mode('fab');
                        input.release();
                        if (!queue)
                            self.endFabMode();
                    }
                    else if ((event.type === 'keypress') && (event.keyCode === keyboard.esc))
                    {
                        holodeck.unitCancelFab();
                        input.release();
                    }
                });
                return true;
            }
            else if (mdevent.button === 2)
            {
                self.endFabMode();
                return true;
            }
            return false;
        };
        
        var holodeckOnSelect = function(wasSelected, prevSelection, promise) {
            return promise.then(function(selection) {
                if (selection)
                {
                    var jSelection = JSON.parse(selection);
                    self.parseSelection(jSelection);
                    self.playSelectionSound(wasSelected, prevSelection, self.hasSelection(), self.selection());
                    return jSelection;
                }
                else
                    return null;
            });
        };
        
        holodeckModeMouseDown['default'] = function(holodeck, mdevent) {
            if (mdevent.button === 0)
            {
                if (model.celestialControlActive()) {
                    if (model.celestialControlModel.findingTargetPlanet()) {
                        model.celestialControlModel.mousedown(mdevent);
                        input.capture(function (event) {
                            if (event.type === 'mouseup' && event.button === 0) {
                                model.celestialControlModel.mouseup(event);
                                input.release();
                            }
                        });
                    }
                    return true;
                }

                var startx = mdevent.offsetX;
                var starty = mdevent.offsetY;
                var dragging = false;
                var now = new Date().getTime();
                if (holodeck.hasOwnProperty('doubleClickId') && (now < holodeck.doubleClickTime))
                {
                    holodeckOnSelect(self.hasSelection(), self.selection(), 
                        holodeck.selectMatchingUnits(getSelectOption(mdevent), [holodeck.doubleClickId])
                    );
                    delete holodeck.doubleClickTime;
                    delete holodeck.doubleClickId;
                }
                else
                {
                    self.mode('select');

                    var wasSelected = model.hasSelection();
                    var prevSelection = model.selection();

                    holodeck.doubleClickTime = now + 250;
                    delete holodeck.doubleClickId;
                    input.capture(holodeck.div, function (event) {
                        if (!dragging && (event.type === 'mousemove'))
                        {
                            dragging = true;
                            holodeck.beginDragSelect(startx, starty);
                            delete holodeck.doubleClickTime;
                        }
                        else if ((event.type === 'mouseup') && (event.button === 0))
                        {
                            
                            input.release();
                            var option = getSelectOption(event);
                            if (dragging)
                                holodeckOnSelect(wasSelected, prevSelection, 
                                    holodeck.endDragSelect(option, {left: startx, top: starty, right: event.offsetX, bottom: event.offsetY})
                                );
                            else
                            {
                                if (self.hasWorldHoverTarget())
                                    holodeck.doubleClickId = self.worldHoverTarget();
                                var index = (holodeck.clickOffset || 0);
                                holodeckOnSelect(wasSelected, prevSelection, 
                                    holodeck.selectAt(option, startx, starty, index)
                                ).then(function (selection) {
                                    if (selection && selection.selectionResult)
                                    {
                                        holodeck.doubleClickId = selection.selectionResult[0];
                                        ++holodeck.clickOffset;
                                        if (!selection.selectionResult.length)
                                            api.camera.maybeSetFocusPlanet();

                                    }
                                });
                            }
                            self.mode('default');
                        }
                        else if ((event.type === 'keypress') && (event.keyCode === keyboard.esc)) {
                            input.release();
                            holodeck.endDragSelect('cancel');
                            self.mode('default');
                        }
                    });
                }

                return true;
            }
            else if ((mdevent.button === 2) && (!self.showTimeControls()))
            {
                if (model.celestialControlActive())
                    return false;

                var startx = mdevent.offsetX;
                var starty = mdevent.offsetY;
                var dragCommand = "";
                // TODO: Consider changing this once we have event timestamps.
                // WLott is concerned that framerate dips will cause this to be wonky.
                var now = new Date().getTime();
                var dragTime = now + 75;
                var queue = mdevent.shiftKey;
                
                input.capture(holodeck.div, function (event) {
                    var eventTime = new Date().getTime();
                    if (self.showTimeControls())
                        self.endCommandMode();
                    
                    if (dragCommand === "" && event.type === 'mousemove' && eventTime >= dragTime)
                    {
                        holodeck.unitBeginGo(startx, starty).then( function(ok) { dragCommand = ok; } );
                    }
                    else if ((event.type === 'mouseup') && (event.button === 2))
                    {
                        input.release();
                        if (dragCommand !== "")
                        {
                            holodeck.unitEndCommand(dragCommand, event.offsetX, event.offsetY, queue).then(function(success) {
                                if (!success || (dragCommand === 'move'))
                                {
                                    // Note: move currently plays its own sound.
                                    return;
                                }
                                var action = dragCommand.charAt(0).toUpperCase() + dragCommand.slice(1);
                                api.audio.playSound("/SE/UI/UI_Command_" + action);
                            });
                        }
                        else
                        {
                            holodeck.unitGo(startx, starty, queue).then(function(action) {
                                if (!action || (action === 'move'))
                                {
                                    // Note: move currently plays its own sound.
                                    return;
                                }
                                var action = action.charAt(0).toUpperCase() + action.slice(1);
                                api.audio.playSound("/SE/UI/UI_Command_" + action);
                            });
                        }
                    }
                });

                return true;
            }
            return false;
        };
        
        var holodeckCommandMouseDown = function (command, targetable) {
      
            var playSound = function(success) {
                if (!success || (command === 'move'))
                {
                    // Note: move currently plays its own sound.
                    return;
                }
                var action = command.charAt(0).toUpperCase() + command.slice(1);
                api.audio.playSound("/SE/UI/UI_Command_" + action);
            };
            return function (holodeck, mdevent) {
                
                if (mdevent.button === 0)
                {
                    engine.call('camera.cameraMaybeSetFocusPlanet');
                    var startx = mdevent.offsetX;
                    var starty = mdevent.offsetY;
                    var dragging = false;
                    // TODO: Consider changing this once we have event timestamps.
                    // WLott is concerned that framerate dips will cause this to be wonky.
                    var now = new Date().getTime();
                    var dragTime = now + 125;
                    var queue = mdevent.shiftKey;
                    model.cmdQueueCount(model.cmdQueueCount() + 1);
                    if (queue && (model.cmdQueueCount() === 1))
                    {
                        var shiftWatch = function(keyEvent) {
                            if (!keyEvent.shiftKey)
                            {
                                $('body').off('keyup', shiftWatch);
                                self.endCommandMode();
                            }
                        };
                        $('body').on('keyup', shiftWatch);
                    }
                    
                    input.capture(holodeck.div, function (event) {
                        var eventTime = new Date().getTime();
                        if (!dragging && event.type === 'mousemove' && eventTime >= dragTime)
                        {
                            holodeck.unitBeginCommand(command, startx, starty).then( function(ok) { dragging = ok; } );
                        }
                        else if ((event.type === 'mouseup') && (event.button === 0))
                        {
                            input.release();
                            if (dragging)
                            {
                                holodeck.unitEndCommand(command, event.offsetX, event.offsetY, queue).then(playSound);
                            }
                            else
                            {
                                if (self.hasWorldHoverTarget() && targetable) 
                                {                     
                                    api.unit.targetCommand(command, self.worldHoverTarget(), queue).then(playSound);
                                }
                                else 
                                {                    
                                    holodeck.unitCommand(command, mdevent.offsetX, mdevent.offsetY, queue).then(playSound);
                                }
                            }
                            if (!queue)
                                self.endCommandMode();
                        }
                        else if ((event.type === 'keypress') && (event.keyCode === keyboard.esc))
                        {
                            input.release();
                            if (dragging)
                            {
                                holodeck.unitCancelCommand();
                            }
                            self.mode('command_' + command);
                        }
                    });

                    return true;
                }
            };
        };
        for (var i = 0; i < self.commands().length; ++i)
        {
            var command = self.commands()[i];
            var targetable = self.targetableCommands()[i];
            holodeckModeMouseDown['command_' + command] = holodeckCommandMouseDown(command, targetable);
        }
    
        $holodeck.mousedown(function (mdevent) {
            if (mdevent.target.nodeName !== 'HOLODECK')
                return;
            
            var holodeck = api.Holodeck.get(this);

            var handler = holodeckModeMouseDown[self.mode()];
            if (handler && handler(holodeck, mdevent)) {
                mdevent.preventDefault();
                mdevent.stopPropagation();
                return;
            }
            
            if (mdevent.button === 1) // middle click
            {
                var oldMode = self.mode();
                self.mode('camera');
                holodeck.beginControlCamera();
                input.capture(holodeck.div, function (event) {
                    var mouseDone = ((event.type === 'mouseup') && (mdevent.button === 1));
                    var escKey = ((event.type === 'keypress') && (event.keyCode === keyboard.esc));
                    if (mouseDone || escKey)
                    {
                        input.release();
                        holodeck.endControlCamera();
                        if (self.mode() === 'camera')
                            self.mode(oldMode);
                    }
                });
                mdevent.preventDefault();
                mdevent.stopPropagation();
                return;
            }

            if (mdevent.button === 2 && self.mode() !== 'default') // right click
            {
                self.endCommandMode()
            }
        });

        //Diplomacy
        self.showDiplomacyPanel = ko.observable(false);
        self.allianceRequestTimeout = ko.observable(60);
        self.diplomaticState = ko.computed(function () {
            if (self.players() && self.players().length && self.armyId()) {
                var state = [];
                var player = _.find(self.players(), function (player) {
                    return player.id === self.armyId();
                });
                _.forEach(_.keys(player.diplomaticState), function (key) {
                    var p = _.find(self.players(), function (player) {
                        return player.id === parseInt(key);
                    });
                    if (p) {
                        var item = new DiplomaticStateItemModel(player.diplomaticState[key].state,
                                                                player.diplomaticState[key].allianceRequestTime,
                                                                p.name,
                                                                p.color,
                                                                p.id,
                                                                p.defeated);

                        state.push(item);

                        if (item.allianceRequestTime()) {
                            console.log(item.allianceRequestTime());
                            console.log(date.getTime());
                            console.log(date.getTime() - item.allianceRequestTime())
                        }
                    }
                });
                return state;
            }
            return null;
        });
        self.setDiplomaticState = function(targetArmyid, state) { self.send_message('change_diplomatic_state', { targetArmyId: targetArmyid, state: state }); };

        
        // Sandbox
        self.sandbox = ko.observable(false);
        self.sandbox_expanded = ko.observable(false);
        self.sandbox_pauseSim = function() { self.send_message('control_sim', { paused: true }); };
        self.sandbox_playSim = function() { self.send_message('control_sim', { paused: false }); };
        self.sandbox_stepSim = function() { self.send_message('control_sim', { step: true }); };
        self.sandbox_units = ko.observable([]); 
        function sandbox_refreshUnits() {
            var result = [];
            for (var spec in self.unitSpecs) {
                var unit = self.unitSpecs[spec];
                result.push({
                    spec: spec,
                    icon: unit.buildIcon
                });
            }
            result.sort(function(a,b) { return a.spec < b.spec ? -1 : (a.spec > b.spec ? 1 : 0); });
            self.sandbox_units(result);
        }
        self.sandbox_copy_unit = function(item) {
            self.maybeSetBuildTarget(item.spec);
            console.log("Copied unit", item.spec);
        };
        self.sandbox_unit_hover = ko.observable(''); 
        self.sandbox_expanded.subscribe(function(on) {
            if (!on)
                return;
            sandbox_refreshUnits();
        });
    }
    model = new LiveGameViewModel();

    handlers.twitchtv_statechange = function (payload) {
        model.twitchStreaming(payload.streamingDesired);
        model.twitchAuthenticated(payload.authenticated);
        model.twitchMicEnabled(payload.enableMicCapture);
        model.twitchSoundsEnabled(payload.enablePlaybackCapture);
    }

    handlers.client_state = function(client) {
        switch (model.mode())
        {
            case 'landing':
                if (client.landing_position)
                    model.landingOk();
                else {
                    model.confirming(false);
                    model.message(loc("!LOC(live_game:pick_a_location_inside_one_of_the_green_zones_to_spawn_your_commander.message):Pick a location inside one of the green zones to spawn your Commander."));
                }
                break;
            default: /* do nothing */ break;
        }
    };
    handlers.server_state = function (msg) {
        var gameOver = (msg.state === 'game_over');
        if (gameOver && !model.gameOverReviewMode()) {
            gameOver = false; // Go where the server wants us to
            model.gameOverReviewMode(true); // If we come back, remember we are in review mode.
        }

        if (!gameOver && msg.url && msg.url !== window.location.href) {
            if (msg.state !== 'game_over')
                model.gameOverReviewMode(false); // Leaving for another reason.  Make sure we are not in game over review mode.
            window.location.href = msg.url;
        }
        else if (msg.data) {
            model.gameOverReviewMode(false);
            model.reviewMode(false);

            model.mode(msg.state);

            model.message("");

            if (msg.data.client && msg.data.client.hasOwnProperty('army_id'))
                model.armyId(msg.data.client.army_id);
            else
                model.armyId(undefined);

            if (msg.data.armies) {
                if (msg.state !== 'replay') {
                    engine.call('execute', 'army_id', JSON.stringify({
                        army_id: !!model.armyId() ? model.armyId() : -1,
                        army_list: _.map(msg.data.armies, function (army) { return army.id; })
                    }));
                }
                
                handlers.army_state(msg.data.armies);
            }

            if (msg.data.client)
                handlers.client_state(msg.data.client);

            // Make sure we start with fab mode and area command mode turned off to match our state.
            api.arch.endFabMode();
            api.arch.endAreaCommandMode();

            switch (msg.state) {
                case 'landing':
                    model.showTimeControls(false);
                    model.showLanding(true);
                    model.mode('landing');
                    engine.call('execute', 'landing_zones', JSON.stringify({ landing_zones: msg.data.client.zones }));
                    break;

                case 'playing':
                    if (model.showLanding()) {
                        api.audio.playSound('/SE/UI/UI_commander_launch');
                        engine.call('audio.setMusic', '/Music/Music_Launch_Commander');
                        model.landingOk();
                    }
                    engine.call('execute', 'all_landings_selected', '{}');
                    model.showLanding(false);
                    model.mode('default');
                    break;

                case 'game_over':
                    model.showLanding(false);
                    model.showTimeControls(true);
                    model.mode('game_over');
                    model.startObserverMode();
                    break;

                case 'replay':
                    model.showTimeControls(true);
                    model.mode('replay');
                    api.time.set(0);
                    break;

                case 'sandbox_playing':
                    model.mode('default');
                    model.controlSingleArmy();
                    model.sandbox(true);
                    break;
            }
        }
    };

    handlers.camera_type = function (payload) {
        // do not hook up cameraMode... it doesn't work correctly and will break the camera
        //model.cameraMode(payload.camera_type); 
        //console.log(payload);

        if (payload.camera_type !== 'space')
            model.selectedCelestialIndex(-1);
    }

    handlers.zoom_level = function (payload) {
        var hdeck = api.holodecks[payload.holodeck];
        hdeck.showCelestial = payload.zoom_level === 'celestial';

        //var showCelestial = _.some(api.holodecks, {showCelestial: true, visible: true});
        //model.showCelestialViewModels(showCelestial);
    };

    handlers.focus_planet_changed = function (payload) {
        model.selectedCelestialIndex(payload.focus_planet);
    };

    handlers.chat_message = function (payload) {
        var date = new Date();
        var chat_message = payload;
        chat_message.timeStamp = date.getTime();
        chat_message.team = !!chat_message.team;
        chat_message.twitch = !!chat_message.twitch;
        model.chatLog.push(chat_message);
        model.visibleChat.push(chat_message);
        $(".div_chat_feed").scrollTop($(".div_chat_feed")[0].scrollHeight);
        $(".div_chat_log_feed").scrollTop($(".div_chat_log_feed")[0].scrollHeight);
    };

    handlers.selection = function (payload) {
        model.parseSelection(payload);
    };

    handlers.hover = function (payload) {		
		model.hasWorldHoverTarget(!$.isEmptyObject(payload));
        model.worldHoverTarget(payload.entity);
    };

    handlers.unit_specs = function (payload) {

        delete payload.message_type;
        model.unitSpecs = payload;
        
        // Fix up cross-unit references
        function crossRef(units) {
            for (var id in units) {
                var unit = units[id];
                unit.id = id;
                if (unit.build) {
                    for (var b = 0; b < unit.build.length; ++b) {
                        var ref = units[unit.build[b]];
                        if (!ref)
                        {
                            ref = {id: unit.build[b]};
                            units[ref.id] = ref;
                        }
                        unit.build[b] = ref;
                    }
                }
                if (unit.projectiles) {
                    for (var p = 0; p < unit.projectiles.length; ++p) {
                        var ref = units[unit.projectiles[p]];
                        if (!ref)
                        {
                            ref = {id: unit.projectiles[p]};
                            units[ref.id] = ref;
                        }
                        unit.projectiles[p] = ref;
                    }
                }
            }
        }
        crossRef(model.unitSpecs);
        
        function getBaseFileName(unit) {
            return unit.id.substring(unit.id.search(start), unit.id.search(end));
        }
        function getBuildKey(unit) {
            return ('000' + (999 - (unit.group || 0))).slice(-3) + 
                   ('000' + (999 - (unit.index || 0))).slice(-3) + 
                   (unit.name || getBaseFileName(unit));
        }
        function addBuildInfo(unit) {
            unit.buildKey = getBuildKey(unit);
            unit.buildIcon = 'img/build_bar/units/' + getBaseFileName(unit) + '.png'
            unit.buildStructure = (unit.categories || []).indexOf('structure') >= 0;
        }
        for (var id in model.unitSpecs) {
            addBuildInfo(model.unitSpecs[id]);
        }
        
        function makeBuildLists(units)
        {
            var buildableCategories = {
                'economy' : true,
                'factory' : true,
                'defense' : true,
                'recon' : true,
            };
            var result = {};
            for (var id in units)
            {
                var unit = units[id];
                if (!unit.build && !unit.projectiles)
                    continue;
                result[id] = {};
                if (unit.build) {
                    result[id].all = unit.build;
                    for (var b = 0; b < unit.build.length; ++b) {
                        var target = unit.build[b];
                        if (typeof(target) === 'string')
                            continue;
                        for (var c = 0; c < target.categories.length; ++c) {
                            var category = target.categories[c];
                            if (!buildableCategories[category])
                                continue;
                            if (!result[id][category])
                                result[id][category] = [];
                            result[id][category].push(target);
                        }
                    }
                }
                if (unit.projectiles) {
                    result[id].all = (result[id].all || []).concat(unit.projectiles);
                }
            }
            return result;
        }
        
        model.buildLists = makeBuildLists(model.unitSpecs);
    };
    
    handlers.unit_data = function (payload) {
        var id;
        var element;
        var sicon;

        model.itemDetails = {};
        for (id in payload.data) {
            element = payload.data[id];
			
			//<custom unit names code>
			var name = element.name;
			for (index = 0; index < model.LUnitNames.RulesArray.length; ++index) {
				var RealName = model.LUnitNames.RulesArray[index].split(" > ")[0];
				var NewName = model.LUnitNames.RulesArray[index].split(" > ")[1];

				name = name.replace(new RegExp(RealName, "g"), NewName);
			}
			//</custom unit names code>
			
            sicon = (element.sicon_override)
                    ? element.sicon_override
                    : id.substring(id.search(start), id.search(end));
            model.itemDetails[id] = new UnitDetailModel(name,
                                                        element.description,
                                                        element.cost,
                                                        sicon);
        }

        // nuke hack 
        // the projectiles are not magically added to the unit_list, so the display details aren't sent to the ui
        model.itemDetails['/pa/units/land/nuke_launcher/nuke_launcher_ammo.json'] = new UnitDetailModel('nuke', 'LR-96 -Pacifier- Missile', 32400);
        model.itemDetails['/pa/units/land/anti_nuke_launcher/anti_nuke_launcher_ammo.json'] = new UnitDetailModel('anti nuke', 'SR-24 -Shield- Missile Defense', 17280);
    };

    handlers.army = function (payload) {
        model.currentEnergy(payload.energy.current);
        model.maxEnergy(payload.energy.storage);

        model.currentMetal(payload.metal.current);
        model.maxMetal(payload.metal.storage);

        model.commanderHealth(payload.commander_health);
        model.armySize(payload.army_size);
    };

    handlers.spectator_data = function (payload) {
        model.spectatorArmyData(payload.armies);
        model.mergeInSpectatorData();
    };

    handlers.celestial_data = function (payload) {
        //console.log(payload);

        var i;
        
        model.systemName(payload.name);

        if (payload.planets.length)
            model.startingPlanetBiome(payload.planets[0].biome);

        if (payload.planets && payload.planets.length) {
            model.celestialViewModels.removeAll();

            for (i = 0; i < payload.planets.length; i++)
                model.celestialViewModels.push(new CelestialViewModel(payload.planets[i]));

            model.celestialViewModels.push(new CelestialViewModel({ isSun: true, index: payload.planets.length }));
        }

        if (model.celestialControlModel.needsReset())
            model.celestialControlModel.reset();

        model.maybePlayStartingMusic(); // starting music depends on planet data
    }

    var prev_index = -1;
    handlers.celestial_positions = function (payload) {
        var has_hover = false;
        var hover_index = -1;

        if (payload.planets && payload.planets.length) {

            function toStyle(value) {
                return '' + value + 'px';
            };

            payload.planets.forEach(function(element, index, array){
                var target = model.celestialViewModels()[index];
                if (target && element.screen) {
                    target.screenX(toStyle(element.screen.x * window.innerWidth));
                    target.screenY(toStyle(element.screen.y * window.innerHeight));
                    target.isHover(!!element.hover);

                    if (target.isHover())
                        hover_index = target.index();
                }
            });
        }

        if (payload.is_sun_hover)
            hover_index = payload.planets.length;
        prev_index = hover_index;

        if (hover_index !== -1)
            model.celestialViewModels()[hover_index].isHover(true);
        model.celestialControlModel.hoverTargetPlanetIndex(hover_index);
    }

    handlers.sim_terminated = function (payload) {
        model.transitPrimaryMessage(loc('!LOC(live_game:connection_to_server_lost.message):CONNECTION TO SERVER LOST'));
        model.transitSecondaryMessage(loc('!LOC(live_game:returning_to_main_menu.message):Returning to Main Menu'));
        model.transitDestination('coui://ui/main/game/start/start.html');
        model.transitDelay(5000);
        model.navToTransit();
    }
    handlers.connection_disconnected = function (payload) {

        if (userTriggeredDisconnect())
            return;

        model.transitPrimaryMessage(loc('!LOC(live_game:connection_to_server_lost.message):CONNECTION TO SERVER LOST'));
        model.transitSecondaryMessage(loc('!LOC(live_game:returning_to_main_menu.message):Returning to Main Menu'));
        model.transitDestination('coui://ui/main/game/start/start.html');
        model.transitDelay(5000);
        model.navToTransit();
    }
    handlers.time = function (payload) {
        model.currentTimeInSeconds(payload.current_time);

        if (!model.inTimeScrub())
            model.endOfTimeInSeconds(payload.end_time);

        model.useTimeScrubHoldValue(false);

        // ###chargrove $REPLAYS temporary workaround for race condition related to lack of armies on client in replays;
        //   the client workaround involves setting its observable army set based on the entities coming from the history,
        //   however that won't help if the JS tries to startObserverMode before the history has made it over to the client.
        //   Using the time handler is a sub-optimal workaround but it's fine for now; remove this once the observable army set
        //   issue is fixed under the hood (see associated $REPLAYS comments)
        if (model.mode() === 'replay' && payload.current_time > 0) {
            model.startObserverMode();
        }
    }
    handlers.army_state = function (armies) {
        var i;
        var army;
        var observer = model.armyId() === undefined;
        var replayArmyCount = 0;
        var landing = false;

        model.players([]);
        model.defeated(false);

        for (i = 0; i < armies.length; i++) {
            army = armies[i];
            
            army.color = 'rgb(' + Math.floor(army.primary_color[0]) + ',' + Math.floor(army.primary_color[1]) + ',' + Math.floor(army.primary_color[2]) + ')';
            army.defeated = !!army.defeated;
            army.disconnected = !!army.disconnected;
            army.landing = !!army.landing;
            army.replay = !!army.replay; // ###chargrove temporary part of the army schema until server state properly reflects observers/replays (re: conversation w/ kfrancis)
            army.metalProductionStr = '';
            army.energyProductionStr = '';
            army.armySize = 0;
            army.armyMetal = 0;
            army.mobileCount = 0;
            army.fabberCount = 0;
            army.factoryCount = 0;
            army.buildEfficiencyStr = 0;

            if (army.landing)
                landing = true;

            if (army.replay) {
                replayArmyCount++;
            }

            if (army.defeated && army.id === model.armyId()) {
                observer = true;
                model.defeated(true);
            }
        }

        if (!landing)
            model.armyAlertModel.hasStarted(true);

        model.armyCount(armies.length);
        model.players(armies);
        model.mergeInSpectatorData();

        if ((model.armyCount() - replayArmyCount) <= 0) {
            observer = true;
        }

        if (observer)
            model.startObserverMode();
        else
            model.controlSingleArmy();      
    }
    handlers.signal_has_valid_launch_site = function (payload) { 
        model.message(loc('!LOC(live_game:position_targeted_click_to_confirm.message):Position targeted. Click to confirm.'));
        model.confirming(true);
    }
    handlers.signal_has_valid_target = function (payload) { /* for planet smash */
        model.celestialControlModel.hasSurfaceTarget(true);
        //model.message(loc('!LOC(live_game:position_targeted_click_to_confirm.message):Position targeted. Click to confirm.'));
        //model.confirming(true);
    }
    handlers.defeated = function (payload) { 
        engine.call('audio.setMusic', '/Music/Music_Commander_Death');
        model.startObserverMode();
    }
    handlers.watch_list = function (payload) {
        if (!model.defeated())
            model.unitAlertModel.processList(payload.list);
    }
    
    handlers.building_planets_ready = function() {
        model.updateGameLoading();
    };

    // inject per scene mods
    if (scene_mod_list['live_game'])
        loadMods(scene_mod_list['live_game']);

    // setup send/recv messages and signals
    app.registerWithCoherent(model, handlers);

    // Activates knockout.js
    ko.applyBindings(model);

    // run start up logic
    model.setup();

    idleTime = 0;
    $('body').keydown(
        function (event) {
            idleTime = 0;
            //console.log(event,'event');
            if (event.keyCode == keyboard.esc)
            {
                if (model.mode() === 'fab')
                    model.endFabMode();
                else if (model.chatSelected()) {
                    model.chatSelected(false);
                    model.mode('default');
                }
                else if (model.mode() === 'default') {
                    if (model.hasSelection())
                    {
                        api.select.empty();
                        model.selection(null);
                    }
                    else
                    {
                        model.optionsBarIsOpen(!model.optionsBarIsOpen());

                        if (model.optionsBarIsOpen())
                            engine.call('push_mouse_constraint_flag', false);
                        else
                            engine.call('pop_mouse_constraint_flag');
                    }
                }
                else if (model.mode().slice(0, 'command_'.length) == 'command_')
                    model.endCommandMode();
                else
                    model.mode('default');
            }
        }
    );
    $('body').mousemove(function (event) {
        idleTime = 0;

        if (model.inTimeScrub()) {
            model.timeScrubCurrentX(event.screenX);
            var dx = model.timeScrubCurrentX() - model.timeScrubStartX();
            var dt = (dx / 384) * model.endOfTimeInSeconds();       
            var target = model.timeScrubBaseTime() + dt;

            if (target > model.endOfTimeInSeconds())
                target = model.endOfTimeInSeconds();
            if (target < 0)
                target = 0;
            api.time.set(Number(target));
        }
    });
    $('body').mouseup(function (event) {
        if (model.inTimeScrub())
            model.stopTimeScrub();
    });
    $('body').click(function(){
        input.doubleTap.reset();
    });
 
    model.lastSceneUrl('coui://ui/main/game/live_game/live_game.html');

    // start periodic update
    setInterval(model.update, 250);
    setInterval(model.removeOldChatMessages, 500);
    setInterval(model.updateIdleTimer, 60000);

    apply_keybinds('gameplay');
    apply_keybinds('camera');
    apply_keybinds('time controls');
    apply_keybinds('hacks');

    engine.call('watchlist.setCreationAlertTypes', JSON.stringify(['Factory']), JSON.stringify([]));
    engine.call('watchlist.setDamageAlertTypes', JSON.stringify(['Commander']), JSON.stringify([]));
    engine.call('watchlist.setDeathAlertTypes', JSON.stringify(['Structure', 'Scout', 'Recon']), JSON.stringify(['Wall']));

    //engine.call('data.request_unit_data');

    model.applyUIDisplaySettings();
    model.initPlayerVision();
    app.hello(handlers.server_state, handlers.connection_disconnected);

    api.twitch.requestState();
});
