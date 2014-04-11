var model;
var handlers = {};

$(document).ready(function () {

    api.game.releaseKeyboard(true);

    var start = /[^\/]*$/;  // ^ : start , \/ : '/', $ : end // as wildcard: /*.json 
    var end = /[.]json$/;

    function WorldUnitHoverModel(object) {
        var self = this;
        /* setup defaults for empty object */
        self.name = ko.observable('');
        self.icon = ko.observable('');
        self.operator = ko.observable('');
        self.status = ko.observable('');
        self.healthFraction = ko.observable(1.0);
        self.isDead = ko.observable(false);
        self.isAlive = ko.computed(function () { return !self.isDead() })
        self.targetHealthFraction = ko.observable(1.0);
        self.targetIsDead = ko.observable(false);
        self.targetIsAlive = ko.computed(function () { return !self.targetIsDead() })

        self.metalGain = ko.observable('');
        self.energyGain = ko.observable('');

        self.energyLoss = ko.observable('');
        self.metalLoss = ko.observable('');

        self.energyDelta = ko.computed(function () { return self.energyGain() - self.energyLoss() });
        self.metalDelta = ko.computed(function () { return self.metalGain() - self.metalLoss() });

        self.id = ko.observable('');
        self.entity = ko.observable(-1);

        self.primaryColor = ko.observable('');
        self.secondaryColor = ko.observable('');

        self.targetPrimaryColor = ko.observable('');
        self.targetSecondaryColor = ko.observable('');

        self.healthWidthString = ko.computed(function () { return '' + (self.healthFraction() * 100) + '%' });

        self.targetHealthWidthString = ko.computed(function () { return '' + (self.targetHealthFraction() * 100) + '%' });

        self.actionTargetName = ko.observable('');
        self.actionTargetId = ko.observable('');

        self.actionIsAttacking = ko.observable(false);
        self.actionIsBuilding = ko.observable(false);
        self.actionIsReclaiming = ko.observable(false);

        self.showAction = ko.computed(function () { return self.actionIsAttacking() || self.actionIsBuilding() || self.actionIsReclaiming() });
        self.hideAction = ko.computed(function () { return !self.showAction() });
        self.showActionTarget = ko.computed(function () { return (self.actionTargetId()) ? true : false });

        self.actionTargetIcon = ko.observable('');

        if ($.isEmptyObject(object))
            return;

        /* end setup */

        self.name(object.name);
		
		//<custom unit names code>
		if (object.tool_details.weapon_target_name) {
			for (index = 0; index < model.LUnitNames.RulesArray.length; ++index) {
				var RealName = model.LUnitNames.RulesArray[index].split(" > ")[0];
				var NewName = model.LUnitNames.RulesArray[index].split(" > ")[1];

				object.tool_details.weapon_target_name = object.tool_details.weapon_target_name.replace(new RegExp(RealName, "g"), NewName);
			}
		}
		if (object.tool_details.build_target_name) {
			for (index = 0; index < model.LUnitNames.RulesArray.length; ++index) {
				var RealName = model.LUnitNames.RulesArray[index].split(" > ")[0];
				var NewName = model.LUnitNames.RulesArray[index].split(" > ")[1];

				object.tool_details.build_target_name = object.tool_details.build_target_name.replace(new RegExp(RealName, "g"), NewName);
			}
		}
		//</custom unit names code>

        self.healthFraction((object && object.health && object.health.max) ? object.health.current / object.health.max : 0);
        self.isDead(self.healthFraction() <= 0);
        if (self.isDead())
            self.healthFraction(object.metal_fraction);
 
        self.metalGain((object.production && self.isAlive()) ? object.production.metal : 0);
        self.energyGain((object.production && self.isAlive()) ? object.production.energy : 0);

        self.energyLoss((object.consumption && self.isAlive()) ? object.consumption.energy : 0);
        self.metalLoss((object.consumption && self.isAlive()) ? object.consumption.metal : 0);

        self.id(object.spec_id);
        self.entity(object.entity);

        self.icon = ko.computed(function () {
            return 'img/build_bar/units/' + self.id().substring(self.id().search(start), self.id().search(end)) + '.png';
        });

        self.primaryColor('rgb(' + Math.floor(object.army.primary_color.r * 255) + ',' + Math.floor(object.army.primary_color.g * 255) + ',' + Math.floor(object.army.primary_color.b * 255) + ')');
        self.secondaryColor('rgb(' + Math.floor(object.army.secondary_color.r * 255) + ',' + Math.floor(object.army.secondary_color.g * 255) + ',' + Math.floor(object.army.secondary_color.b * 255) + ')');

        if (self.isAlive() && object.tool_details && object.tool_details.weapon_target) {
            self.actionIsAttacking(true);
           
            self.actionTargetName(object.tool_details.weapon_target_name);
            self.actionTargetId(object.tool_details.weapon_target_id);

            self.targetHealthFraction(object.tool_details.weapon_target_health);

            self.energyLoss(self.energyLoss() + object.tool_details.energy);
            self.metalLoss(self.metalLoss() + object.tool_details.metal);
            self.targetIsDead(object.tool_details.weapon_target_is_dead);
        }

        if (self.isAlive() && object.tool_details && object.tool_details.build_target) {

            if (object.tool_details.build_target_reclaiming)
                self.actionIsReclaiming(true);
            else
                self.actionIsBuilding(true);

            self.actionTargetName(object.tool_details.build_target_name);
            self.actionTargetId(object.tool_details.build_target_id);
            self.targetHealthFraction(object.tool_details.build_target_health);
            self.targetIsDead(object.tool_details.build_target_is_dead);

            self.energyLoss(self.energyLoss() + object.tool_details.energy);
            self.metalLoss(self.metalLoss() + object.tool_details.metal);
        }

        if (self.actionTargetId()) {
            self.actionTargetIcon = ko.computed(function () {
                return 'img/build_bar/units/' + self.actionTargetId().substring(self.actionTargetId().search(start), self.actionTargetId().search(end)) + '.png';
            });
        }
    }

    function LiveGameHoverViewModel() {
        var self = this;

        self.worldHoverTarget = ko.observable(new WorldUnitHoverModel({}));
        self.hasWorldHoverTarget = ko.observable(false);

    }
    model = new LiveGameHoverViewModel();

    handlers.hover = function (payload) {
        model.hasWorldHoverTarget(!$.isEmptyObject(payload));

        if (model.hasWorldHoverTarget()) {
			//<custom unit names code>
			var name = payload.name;
			if (name) {
				for (index = 0; index < model.LUnitNames.RulesArray.length; ++index) {
					var RealName = model.LUnitNames.RulesArray[index].split(" > ")[0];
					var NewName = model.LUnitNames.RulesArray[index].split(" > ")[1];

					name = name.replace(new RegExp(RealName, "g"), NewName);
				}
			}
			payload.name = name;
			//</custom unit names code>
			
            model.worldHoverTarget(new WorldUnitHoverModel(payload));
		}
    }

    // inject per scene mods
    if (scene_mod_list['live_game_hover'])
        loadMods(scene_mod_list['live_game_hover']);

    // setup send/recv messages and signals
    app.registerWithCoherent(model, handlers);

    // Activates knockout.js
    ko.applyBindings(model);
});
